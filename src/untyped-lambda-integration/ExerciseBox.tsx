import React, { PureComponent } from 'react'
import { uniqueKey } from '../uniqueKey'

import {
  AST,
  ASTReduction,
  None,
  Token,
  tokenize,
  parse,
  OptimizeEvaluator,
  MacroMap,
  OpenMacroDefinition,
} from "@lambdulus/core"

import './styles/EvaluatorBox.css'

import { BoxType } from '../Types'

import { TreeComparator } from './TreeComparator'
import InactiveEvaluator from './InactiveExpression'
import Expression from './Expression'
import { PromptPlaceholder, UntypedLambdaState, Evaluator, StepRecord, Breakpoint, UntypedLambdaType, StepMessage, StepValidity } from './Types'
import { strategyToEvaluator, findSimplifiedReduction, MacroBeta, toMacroMap, tryMacroContraction, coreErrorMessage } from './Constants'


export interface EvaluationProperties {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
}

// The exercise-step submitter reports parse failures locally, through
// the editor error — same shape as the expression submitter above.
function exerciseSyntaxError (content : string, exception : unknown = null) : Error {
  // Core reports open macro definitions as a typed error carrying
  // the macro name and its free variables -- show it as is.
  if (exception instanceof OpenMacroDefinition) {
    return Error(exception.message)
  }

  // Anything else falls back to core's own message.
  let errorMessage : string = exception !== null && exception !== undefined
    ? coreErrorMessage(exception)
    : "Something is wrong with your expression. Please inspect it closely."

  if (content.match(/:=/g)?.length !== content.match(/;/g)?.length) {
    errorMessage = "Did you forget to write a semicolon after the Macro definition?"
  }
  if (content.match(/\s*;\s*$/g)) {
    errorMessage = "There's a semicolon at the end."
  }

  return Error(errorMessage)
}

export default class ExerciseBox extends PureComponent<EvaluationProperties> {
  constructor (props : EvaluationProperties) {
    super(props)

    this.onContent = this.onContent.bind(this)
    this.onSubmitExpression = this.onSubmitExpression.bind(this)
    this.parseExpression = this.parseExpression.bind(this)
    this.onEnter = this.onEnter.bind(this)
    this.onExerciseStep = this.onExerciseStep.bind(this)
    this.onSimplifiedExerciseStep = this.onSimplifiedExerciseStep.bind(this)
    this.onStep = this.onStep.bind(this)
    this.onSimplifiedStep = this.onSimplifiedStep.bind(this)
    this.shouldBreak = this.shouldBreak.bind(this)
    this.createBoxFrom = this.createBoxFrom.bind(this)
  }

  render () : JSX.Element {
    const { state, isActive, addBox } : EvaluationProperties = this.props
    const {
      minimized,
      history,
      breakpoints,
      editor,
      SDE,
      macrotable,
    } : UntypedLambdaState = state

    let className : string = 'box boxEval boxExercise'
    const { isNormalForm } = history.length ? history[history.length - 1] : { isNormalForm : false }

    // TODO: Maybe I will take this out
    // Frontend may take care of that
    if (minimized) {
      return (
        <InactiveEvaluator
          className={ className }
          breakpoints={ breakpoints }
          history={ history }
          strategy={ this.props.state.strategy }
          SDE={ SDE }
          macrotable={ macrotable }
          createBoxFrom={ this.createBoxFrom }
        />
      )
    }

    return (
      <Expression
        className={ className }
        isExercise={ true }
        state={ state }
        breakpoints={ breakpoints }
        history={ history }
        editor={ editor }
        isNormalForm={ isNormalForm }
        shouldShowDebugControls={ isActive }

        createBoxFrom={ this.createBoxFrom }
        setBoxState={ this.props.setBoxState }
        onContent={ this.onContent }
        onEnter={ this.onEnter }
        onExecute={ () => void 0 }
        addBox={ addBox }
      />
    )
  }

  createBoxFrom (stepRecord : StepRecord) : UntypedLambdaState {
    const { state } : EvaluationProperties = this.props
    const {
      strategy,
      SLI,
      SDE,
      ETA,
      expandStandalones,
      collapseOldSteps,
      macrotable,
    } : UntypedLambdaState = state
    const { ast } = stepRecord
    const content = ast.toString()

    return {
      __key : uniqueKey(),
      type : BoxType.UNTYPED_LAMBDA,
      subtype : UntypedLambdaType.EMPTY,
      title : `Copy of ${state.title}`,
      minimized : false,
      settingsOpen : false,
      expression : "",
      ast : null,
      history : [],
      isRunning : false,
      breakpoints : [],
      timeoutID : undefined,
      timeout : 10,
      strategy,
      SDE,
      ETA,
      SLI,
      expandStandalones,
      collapseOldSteps,
      macrolistOpen : false,
      macrotable : { }, // ...macrotable, ...this.props.macroContext.macrotable
      editor : {
        placeholder : PromptPlaceholder.EVAL_MODE,
        content : Object.entries(macrotable).map(([name, definition] : [string, string]) => name + ' := ' + definition + ' ;\n').join('') + content,
        syntaxError : null,
      }
    }
  }

  onContent (content : string) : void {
    const { state, setBoxState } = this.props

    setBoxState({
      ...state,
      editor : {
        ...state.editor,
        content,
        syntaxError : null,
      }
    })
  }

  onEnter () : void {
    const { editor : { content } } = this.props.state

    // Empty input steps for the user; anything else validates as their
    // step. No fall-through: validating '' would flag a step that was
    // just taken for them.
    if (content === '') {
      this.onStep()
      return
    }

    this.onExerciseStep()
  }

  onSubmitExpression () : void {
    const { state, setBoxState } = this.props
    const {
      strategy,
      editor : { content },
      macrotable,
    } = state

    try {
      // const definitions : Array<string> = content.split(';')
      // const expression : string = definitions.pop() || ""
      // const macromap : MacroMap = toMacroMap(definitions, SLI)
      // const newMacrotable : MacroMap = { ...macrotable, ...macromap } // the local macromap has a higher priority
      const ast : AST = this.parseExpression(content, macrotable)

      let message : StepMessage = { validity : StepValidity.CORRECT, userInput : content, message : '' }
      let isNormal = false

      const astCopy : AST = ast.clone()
      const evaluator : Evaluator = new (strategyToEvaluator(strategy))(astCopy)
      if (evaluator.nextReduction instanceof None) {
        isNormal = true
        message.message = 'Expression is in normal form.'
      }

      setBoxState({
        ...state,
        ast,
        expression : content,
        history : [ {
          ast : ast.clone(),
          lastReduction : new None(),
          step : 0,
          message,
          isNormalForm : isNormal,
          exerciseStep : true,
        } ],
        editor : {
          content : '',
          placeholder : PromptPlaceholder.EVAL_MODE,
          syntaxError : null,
        }
      })
    } catch (exception) {
      let errorMessage : string = exception instanceof OpenMacroDefinition
        ? exception.message
        : coreErrorMessage(exception)
      console.error(coreErrorMessage(exception))

      if (content.match(/:=/g)?.length !== content.match(/;/g)?.length) {
        errorMessage = "Did you forget to write a semicolon after the Macro definition?"
      }
      if (content.match(/\s*;\s*$/g)) {
        errorMessage = "There's a semicolon at the end."
      }
      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : Error(errorMessage),
        }
      })
    }
  }

  onSimplifiedExerciseStep () {
    const { state, setBoxState } = this.props
    const { strategy, history, editor : { content }, macrotable, SLI, ETA } = state

    try {
      const definitions : Array<string> = content.split(';')
      const expression : string = definitions.pop() || ""
      const macromap : MacroMap = toMacroMap(definitions, SLI)
      const newMacrotable : MacroMap = { ...macrotable, ...macromap } // the local macromap has a higher priority

      const userAst : AST = this.parseExpression(expression, newMacrotable)
      const stepRecord : StepRecord = history[history.length - 1]
      const { isNormalForm, step } = stepRecord
      let { ast, lastReduction } = stepRecord
      ast = ast.clone()

      if (isNormalForm) {
        // TODO: do something about it
        // say user - there are no more steps and it is in normal form        
        // TODO: consider immutability
        stepRecord.message.message = 'No more steps available. Expression is in normal form.'

        setBoxState({
          ...state,
        })

        return
      }
      const newast : AST = ast.clone()
      let [nextReduction, evaluateReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(newast, strategy, macrotable)
      if (nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(newast)

        if (etaEvaluator.nextReduction instanceof None || ! ETA) {
          // TODO: refactor PLS - update history
          // TODO: say user it is in normal form and they are mistaken
          stepRecord.isNormalForm = true
          stepRecord.message.message = 'Expression is already in normal form.'
          setBoxState({
            ...state,
          })

          return
        }

        ast = etaEvaluator.perform()
        lastReduction = etaEvaluator.nextReduction
      }
      else {
        ast = evaluateReduction(newast)
      }

      let isNormal = false

      {

        const astCopy : AST = ast.clone()
        const [nextReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(astCopy, strategy, macrotable)
        if (nextReduction instanceof None) {
          const etaEvaluator : Evaluator = new OptimizeEvaluator(astCopy)

          if (etaEvaluator.nextReduction instanceof None || ! ETA) {
            isNormal = true
          }
        }
      }
      let message : StepMessage = { validity : StepValidity.CORRECT, userInput : content, message : '' }
      const comparator : TreeComparator = new TreeComparator([ userAst, ast ], [ newMacrotable, macrotable ])

      if (comparator.equals) {
        ast = userAst
        message.message = 'Correct.'
      }
      else {
        // TODO: say user it was incorrect
        // TODO: na to se pouzije uvnitr EvaluatorState prop messages nebo tak neco
        message.message = `Incorrect step. ${content}`
        message.validity = StepValidity.INCORRECT
      }

      setBoxState({
        ...state,
        history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal, exerciseStep : true } ],
        editor : {
          ...state.editor,
          content : Object.entries(newMacrotable).map(([name, definition] : [string, string]) => name + ' := ' + definition + ' ;\n').join('') + ast.toString(),
          placeholder : PromptPlaceholder.VALIDATE_MODE,
          syntaxError : null,
        }
      })
    } catch (exception) {
      console.error(coreErrorMessage(exception))

      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : exerciseSyntaxError(content, exception),
        }
      })
    }


    ///////////////////////////////////////////////////////////////////////////////////////////
  }

  onExerciseStep () {
    const { state, setBoxState } = this.props
    const { strategy, history, editor : { content }, SDE, macrotable, SLI, ETA } = state
    if (SDE === true) {
      this.onSimplifiedExerciseStep()
      return
    }


    try {
      const definitions : Array<string> = content.split(';')
      const expression : string = definitions.pop() || ""
      const macromap : MacroMap = toMacroMap(definitions, SLI)
      const newMacrotable : MacroMap = { ...macrotable, ...macromap } // the local macromap has a higher priority

      const userAst : AST = this.parseExpression(expression, newMacrotable)
      // HERE
      const stepRecord : StepRecord = history[history.length - 1]
      const { isNormalForm, step } = stepRecord
      let { ast, lastReduction } = stepRecord
      ast = ast.clone()

      if (isNormalForm) {
        // TODO: do something about it
        // say user - there are no more steps and it is in normal form        
        // TODO: consider immutability
        stepRecord.message.message = 'No more steps available. Expression is in normal form.'

        setBoxState({
          ...state,
        })

        return
      }
      let evaluator : Evaluator = new (strategyToEvaluator(strategy))(ast)
      lastReduction = evaluator.nextReduction
      if (evaluator.nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

        if (etaEvaluator.nextReduction instanceof None || ! ETA) {
          // TODO: refactor PLS - update history
          // TODO: say user it is in normal form and they are mistaken
          stepRecord.isNormalForm = true
          stepRecord.message.message = 'Expression is already in normal form.'
          setBoxState({
            ...state,
          })
          return
        }

        evaluator = etaEvaluator
        lastReduction = etaEvaluator.nextReduction

      }
      ast = evaluator.perform()

      let isNormal = false

      {
        const astCopy : AST = ast.clone()
        const evaluator : Evaluator = new (strategyToEvaluator(strategy))(astCopy)
        if (evaluator.nextReduction instanceof None) {
          const etaEvaluator : Evaluator = new OptimizeEvaluator(astCopy)

          if (etaEvaluator.nextReduction instanceof None || ! ETA) {
            isNormal = true
          }
        }
      }
      let message : StepMessage = { validity : StepValidity.CORRECT, userInput : content, message : '' }
      const comparator : TreeComparator = new TreeComparator([ userAst, ast ], [ newMacrotable, macrotable ])

      if (comparator.equals) {
        ast = userAst
        message.message = 'Correct.'
      }
      else {
        // TODO: say user it was incorrect
        // TODO: na to se pouzije uvnitr EvaluatorState prop messages nebo tak neco
        message.message = `Incorrect step. ${content}`
        message.validity = StepValidity.INCORRECT
      }

      setBoxState({
        ...state,
        history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal, exerciseStep : true } ],
        editor : {
          ...state.editor,
          content : Object.entries(newMacrotable).map(([name, definition] : [string, string]) => name + ' := ' + definition + ' ;\n').join('') + ast.toString(),
          placeholder : PromptPlaceholder.VALIDATE_MODE,
          syntaxError : null,
        }
      })
    } catch (exception) {
      console.error(coreErrorMessage(exception))

      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : exerciseSyntaxError(content, exception),
        }
      })
    }
  }

  onSimplifiedStep () : void {


    const { state, setBoxState } = this.props
    const { strategy, history, editor : { content }, macrotable, ETA } = state
    const stepRecord = history[history.length - 1]
    const { isNormalForm, step } = stepRecord
    const ast = stepRecord.ast.clone()
    let newast = ast

    if (isNormalForm) {
      return
    }


    //                                                    fix this part please
    let [nextReduction, evaluateReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(ast, strategy, macrotable)
    let message : StepMessage = { validity : StepValidity.CORRECT, userInput : content, message : '' }
    let isNowNormalForm = false


    if (nextReduction instanceof MacroBeta) {
      // z macrobeta si vytahnu aritu makra
      const arity : number = nextReduction.arity

      // a zkontroluju jestli velikost pole odpovida arite
      if (nextReduction.applications.length !== arity) {
        // pokud arita nesedi - je vetsi nez delka pole aplikaci -->
        // --> musim vyhlasit warning a rict, ze tenhle krok neni uplne gooda
        stepRecord.message.message = `Macro ${tryMacroContraction(nextReduction.applications[0].left, macrotable)} is given too few arguments.`

        newast = evaluateReduction(newast)

        // this.setState({
        //   ...state,
        // })
        // return
      }
      else {
        // this is what happens when ::single-step
        //
        newast = evaluateReduction(newast)

        // if we are not ::single-step --> findSimplifiedReduction won't return MacroBeta -- instead
        // it will return the first redex --> first beta reduction in the list and then it's not macro reduction problem anymore
        // so next consecutive redex search will just find pretty normal situation as it probably should
      }
    }
    else if (nextReduction instanceof None) {
      const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

      if (etaEvaluator.nextReduction instanceof None || ! ETA) {
        stepRecord.isNormalForm = true
        stepRecord.message.message = 'Expression is in normal form.'
        setBoxState({
          ...state,
        })
        return  
      }

      newast = etaEvaluator.perform()
      nextReduction = etaEvaluator.nextReduction
    }
    else {
      newast = evaluateReduction(newast)
    }


    {
      const astCopy : AST = newast.clone()
      const [nextReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(astCopy, strategy, macrotable)
      if (nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(astCopy)

        if (etaEvaluator.nextReduction instanceof None || ! ETA) {
          isNowNormalForm = true
          message.message = 'Expression is in normal form.'
        }
      }
    }

    setBoxState({
      ...state,
      editor : {
        ...state.editor,
        content : ast.toString(),
      },
      history : [ ...history, { ast : newast, lastReduction : nextReduction, step : step + 1, message, isNormalForm : isNowNormalForm, exerciseStep : true } ],
    })

    return
  }

  onStep () : void {
    const { state, setBoxState } = this.props
    const { strategy, history, SDE, ETA } = state
    const stepRecord = history[history.length - 1]
    const { isNormalForm, step } = stepRecord
    let { ast, lastReduction } = stepRecord
    ast = ast.clone()
    if (isNormalForm) {
      return
    }

    if (SDE) {
      this.onSimplifiedStep()
      return
    }


    let evaluator : Evaluator = new (strategyToEvaluator(strategy))(ast)
    lastReduction = evaluator.nextReduction
    if (evaluator.nextReduction instanceof None) {
      const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

      if (etaEvaluator.nextReduction instanceof None || ! ETA) {
        stepRecord.isNormalForm = true
        stepRecord.message.message = 'Expression is in normal form.'
        setBoxState({
          ...state,
        })

        return
      }

      evaluator = etaEvaluator
      lastReduction = etaEvaluator.nextReduction
    }
    ast = evaluator.perform()

    let message : StepMessage = { message : 'Evaluating One Step for You', validity : StepValidity.CORRECT, userInput : '' }
    let isNormal = false

    {
      const astCopy : AST = ast.clone()
      const evaluator : Evaluator = new (strategyToEvaluator(strategy))(astCopy)
      if (evaluator.nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

        if (etaEvaluator.nextReduction instanceof None || ! ETA) {
          isNormal = true
          message.message = 'Expression is in normal form.'
        }
      }
    }

    // ANCHOR: #0023
    // NOTE: This is completely crazy - it doesn't make any sense
    // TODO: Investigate more - and fix the functionality
    // it probably should check if the current AST Root is a Macro and next Reduction is Expansion of exactly this AST
    // then it can say - it is in the Normal Form - if some settings enables it - not by default though
    //
    // if (ast instanceof Macro || ast instanceof ChurchNumeral) {

    //   stepRecord.isNormalForm = true
    //   stepRecord.message = 'Expression is in normal form.'

    //   reportEvent('Evaluation Step', 'Step Normal Form Reached with Number or Macro', ast.toString())
    // }
    setBoxState({
      ...state,
      editor : {
        ...state.editor,
        content : ast.toString(),
      },
      history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal, exerciseStep : true } ],

    })
  }

  // TODO: breakpointy se pak jeste musi predelat
  shouldBreak (breakpoint : Breakpoint, reduction : ASTReduction) : boolean {
    // // if (reduction.type === breakpoint.type
    // //     && reduction instanceof Beta && breakpoint.context instanceof Lambda
    // //     && reduction.target.identifier === breakpoint.context.body.identifier
    // //   ) {
    // //     return true
    // // }
    // if (reduction.type === breakpoint.type
    //     && reduction instanceof Beta && breakpoint.context instanceof Variable
    //     && reduction.redex.left instanceof Lambda
    //     && reduction.redex.left.argument.identifier === breakpoint.context.identifier
    //     && ! breakpoint.broken.has(reduction.redex.left.argument)
    // ) {
    //   return true
    // }

    // if (reduction.type === breakpoint.type
    //     && reduction instanceof Expansion && breakpoint.context instanceof ChurchNumeral
    //     && reduction.target.identifier === breakpoint.context.identifier
    //     && ! breakpoint.broken.has(reduction.target)
    // ) {
    //   return true
    // }
    // if (reduction.type === breakpoint.type
    //     && reduction instanceof Expansion && breakpoint.context instanceof Macro
    //     && reduction.target.identifier === breakpoint.context.identifier
    //     && ! breakpoint.broken.has(reduction.target)
    // ) {
    //   return true
    // }
    return false
  }

  // THROWS Exceptions
  parseExpression (expression : string, macrotable : MacroMap) : AST {
    // const { macrotable } = this.props.macroContext

    const { SLI : singleLetterVars } = this.props.state

    const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars, macromap : macrotable })
    const ast : AST = parse(tokens, macrotable) // macroTable

    return ast
  }
}