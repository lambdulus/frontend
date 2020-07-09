import React, { PureComponent, ReactNode } from 'react'

import {
  AST,
  ASTReduction,
  None,
  NormalEvaluator,
  Beta,
  Lambda,
  Variable,
  Expansion,
  ChurchNumeral,
  Macro,
  Token,
  tokenize,
  parse,
  ApplicativeEvaluator,
  OptimizeEvaluator,
  MacroMap,
  NormalAbstractionEvaluator,
} from "@lambdulus/core"

import './styles/EvaluatorBox.css'

import { BoxType, BoxState } from '../Types'

import { TreeComparator } from './TreeComparator'
import EmptyEvaluator from './EmptyExpression'
import InactiveEvaluator from './InactiveExpression'
import Expression from './Expression'
import { EvaluationStrategy, PromptPlaceholder, UntypedLambdaState, Evaluator, StepRecord, Breakpoint, UntypedLambdaType, UntypedLambdaExpressionState } from './Types'
import { reportEvent } from '../misc'
// import { MContext } from './MacroContext'


export function strategyToEvaluator (strategy : EvaluationStrategy) : Evaluator {
  switch (strategy) {
    case EvaluationStrategy.NORMAL:
      return NormalEvaluator as any
 
    case EvaluationStrategy.APPLICATIVE:
      return ApplicativeEvaluator as any

    case EvaluationStrategy.OPTIMISATION:
      return OptimizeEvaluator as any

    case EvaluationStrategy.ABSTRACTION:
      return NormalAbstractionEvaluator as any
  }
}

export interface EvaluationProperties {
  state : UntypedLambdaExpressionState
  isActive : boolean
  isFocused : boolean
  macroContext : { macrotable : MacroMap }

  setBoxState (state : UntypedLambdaExpressionState) : void
  addBox (box : UntypedLambdaState) : void
}

export default class ExerciseBox extends PureComponent<EvaluationProperties> {
  constructor (props : EvaluationProperties) {
    super(props)

    this.onContent = this.onContent.bind(this)
    this.onSubmitExpression = this.onSubmitExpression.bind(this)
    this.parseExpression = this.parseExpression.bind(this)
    this.onEnter = this.onEnter.bind(this)
    this.onExerciseStep = this.onExerciseStep.bind(this)
    this.onStep = this.onStep.bind(this)
    this.onExecute = this.onExecute.bind(this)
    this.onRun = this.onRun.bind(this)
    this.onStop = this.onStop.bind(this)
    this.shouldBreak = this.shouldBreak.bind(this)
    this.createBoxFrom = this.createBoxFrom.bind(this)
  }

  render () : JSX.Element {
    const { state, isActive, addBox } : EvaluationProperties = this.props
    const {
      minimized,
      history,
      breakpoints,
      // isExercise,
      strategy,
      expression,
      editor,
    } : UntypedLambdaExpressionState = state

    let className : string = 'box boxEval boxExercise'
    const { isNormalForm } = history.length ? history[history.length - 1] : { isNormalForm : false }

    if (expression === '') {
      return (
        <EmptyEvaluator
          className={ className }
          isActive={ this.props.isActive }
          editor={ editor }
          history={ history }

          onContent={ this.onContent }
          onEnter={ this.onEnter }
          onExecute={ this.onExecute }
        />
      )
    }

    // NOTE: commenting now - Exercise Box will come later
    // if (isExercise) {
    //   className += ' boxExercise'
    // }

    // TODO: Maybe I will take this out
    // Frontend may take care of that
    if (minimized) {
      return (
        <InactiveEvaluator
          className={ className }
          breakpoints={ breakpoints }
          history={ history }
          strategy={ this.props.state.strategy }
          
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
        onExecute={ this.onExecute }
        addBox={ addBox }
      />
    )
  }

  createBoxFrom (stepRecord : StepRecord) : UntypedLambdaState {
    const { state } : EvaluationProperties = this.props
    const {
      strategy,
      SLI,
      expandStandalones,
      macrotable,
    } : UntypedLambdaExpressionState = state
    const { ast } = stepRecord
    const content = ast.toString()

    return {
      __key : Date.now().toString(),
      type : BoxType.UNTYPED_LAMBDA,
      subtype : UntypedLambdaType.ORDINARY,
      title : `Copy of ${state.title}`,
      minimized : false,
      menuOpen : false,
      settingsOpen : false,
      expression : "",
      ast : null,
      history : [],
      isRunning : false,
      breakpoints : [],
      timeoutID : undefined,
      timeout : 10,
      // isExercise : false,
      strategy,
      SLI,
      expandStandalones,
      macrolistOpen : false,
      macrotable : { ...macrotable, ...this.props.macroContext.macrotable },
      editor : {
        placeholder : PromptPlaceholder.EVAL_MODE,
        content,
        caretPosition : content.length,
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
    // TODO: refactor - clean this
    const { expression, editor : { content } } = this.props.state

    if (expression === '') {
      this.onSubmitExpression()
    }

    this.onExerciseStep()

    // else if (content !== '') { // && isExercise
    //   this.onExerciseStep()
    // }
    // else if (content === '') { //  && (! isExercise)
    //   this.onStep()
    // }
    // else {
    //   console.log('Error: Something unexpected just happened. A')
    // }
  }

  onSubmitExpression () : void {
    const { state, setBoxState } = this.props
    const {
      strategy,
      editor : { content },
    } = state

    try {
      const ast : AST = this.parseExpression(content)

      let message = ''
      let isNormal = false

      const astCopy : AST = ast.clone()
      const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
      
      if (evaluator.nextReduction instanceof None) {
        isNormal = true
        message = 'Expression is in normal form.'
        
        // reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
      }

      setBoxState({
        ...state,
        ast,
        expression : content,
        history : [ {
          ast : ast.clone(),
          lastReduction : new None,
          step : 0,
          message,
          isNormalForm : isNormal
        } ],
        editor : {
          content : '',
          caretPosition : 0,
          placeholder : PromptPlaceholder.EVAL_MODE,
          syntaxError : null,
        }
      })

      reportEvent('Submit Expression', 'submit valid', content)
    } catch (exception) {
      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : exception.toString(),
        }
      })

      reportEvent('Submit Expression', 'submit invalid', content)
    }
  }

  onExerciseStep () {
    console.log('EXERCISE STEP')
    const { state, setBoxState } = this.props
    const { strategy, history, editor : { content } } = state
    
    try {
      const userAst : AST = this.parseExpression(content)
      const stepRecord : StepRecord = history[history.length - 1]
      const { isNormalForm, step } = stepRecord
      let { ast, lastReduction } = stepRecord
      ast = ast.clone()

      if (isNormalForm) {
        // TODO: do something about it
        // say user - there are no more steps and it is in normal form        
        // TODO: consider immutability
        stepRecord.message = 'No more steps available. Expression is in normal form.'

        setBoxState({
          ...state,
        })

        reportEvent('Exercise Step', 'Step Already in normal form', content)

        return
      }
    
      const normal : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
      lastReduction = normal.nextReduction
    
      if (normal.nextReduction instanceof None) {
        // TODO: refactor PLS - update history
        // TODO: say user it is in normal form and they are mistaken
        stepRecord.isNormalForm = true
        stepRecord.message = 'Expression is already in normal form.'
        
        setBoxState({
          ...state,
        })

        reportEvent('Exercise Step', 'Step Already in Normal Form', content)
        
        return
      }
    
      ast = normal.perform()

      let isNormal = false

      {
        const astCopy : AST = ast.clone()
        const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
        
        if (evaluator.nextReduction instanceof None) {
          isNormal = true
          
          reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
        }
      }
    
      let message : string = ''
      const comparator : TreeComparator = new TreeComparator([ userAst, ast ])

      if (comparator.equals) {
        ast = userAst
        message = 'Correct.'

        reportEvent('Exercise Step', 'Valid Step', content)
      }
      else {
        // TODO: say user it was incorrect
        // TODO: na to se pouzije uvnitr EvaluatorState prop messages nebo tak neco
        // console.log('Incorrect step')
        message = `Incorrect step. ${content}`

        reportEvent('Exercise Step', 'Invalid Step', content)
      }

      setBoxState({
        ...state,
        history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal } ],
        editor : {
          ...state.editor,
          content : '',
          caretPosition : 0,
          placeholder : PromptPlaceholder.VALIDATE_MODE,
          syntaxError : null,
        }
      })
    } catch (exception) {
      // TODO: print syntax error
      // TODO: do it localy - no missuse of onSubmit

      // TODO: print syntax error

      reportEvent('Exercise Step', 'Syntax error in Step', content)
    }
  }

  onStep () : void {
    // console.log('DOIN ONE STEP')
    // const { state, setBoxState } = this.props
    // const { strategy, history, editor : { content } } = state
    // const stepRecord = history[history.length - 1]
    // const { isNormalForm, step } = stepRecord
    // let { ast, lastReduction } = stepRecord
    // ast = ast.clone()
  
    // if (isNormalForm) {
    //   return
    // }

    // const normal : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
    // lastReduction = normal.nextReduction
  
    // if (normal.nextReduction instanceof None) {
    //   console.log('NEXT IS NONE')
    //   stepRecord.isNormalForm = true
    //   stepRecord.message = 'Expression is in normal form.'
      
    //   setBoxState({
    //     ...state,
    //   })
      
    //   reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())

    //   return
    // }
  
    // ast = normal.perform()

    // // ANCHOR: #0023
    // // NOTE: This is completely crazy - it doesn't make any sense
    // // TODO: Investigate more - and fix the functionality
    // // it probably should check if the current AST Root is a Macro and next Reduction is Expansion of exactly this AST
    // // then it can say - it is in the Normal Form - if some settings enables it - not by default though
    // //
    // // if (ast instanceof Macro || ast instanceof ChurchNumeral) {
    // //   console.log('CURRENT IS MACRO OR NUMBER')

    // //   stepRecord.isNormalForm = true
    // //   stepRecord.message = 'Expression is in normal form.'

    // //   reportEvent('Evaluation Step', 'Step Normal Form Reached with Number or Macro', ast.toString())
    // // }
  
    // setBoxState({
    //   ...state,
    //   history : [ ...history, { ast, lastReduction, step : step + 1, message : '', isNormalForm : false } ],

    // })

    // reportEvent('Evaluation Step', 'Step', ast.toString())
  }

  onExecute () : void {
    // const { state, setBoxState } = this.props
    // const { isRunning } = state

    // // if (isExercise) {
    // //   // TODO: exercises can not be run - some message to user???
    // //   return
    // // }

    // if (isRunning) {
    //   this.onStop()
    // }
    // else {
    //   const { timeout, history } = state
    //   const stepRecord = history[history.length - 1]
  
    //   if (stepRecord.isNormalForm) {
    //     return
    //   }
      
    //   const { ast, step, lastReduction, isNormalForm, message } = stepRecord
    //   history.push(history[history.length - 1])
    //   history[history.length - 2] = { ast : ast.clone(), step, lastReduction, message : 'Skipping some steps...', isNormalForm }

    //   setBoxState({
    //     ...state,
    //     isRunning : true,
    //     timeoutID : window.setTimeout(this.onRun, timeout),
    //   })

    //   reportEvent('Execution', 'Run Evaluation', ast.toString())
    // }
  }

  onRun () : void {
    // const { state, setBoxState } = this.props
    // const { strategy } = state
    // let { history, isRunning, breakpoints, timeoutID, timeout } = state
    // const stepRecord : StepRecord = history[history.length - 1]
    // const { isNormalForm, step } = stepRecord
    // let { lastReduction } = stepRecord

    // if ( ! isRunning) {
    //   return
    // }
    
    // if (isNormalForm) {
    //   setBoxState({
    //     ...state,
    //     isRunning : false,
    //     timeoutID : undefined,
    //   })
  
    //   return
    // }
  
    // let { ast } = stepRecord
    // const normal : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
    // lastReduction = normal.nextReduction
    
    // if (normal.nextReduction instanceof None) {
    //   // TODO: consider immutability
    //   history.pop()
    //   history.push({
    //     ast,
    //     lastReduction : stepRecord.lastReduction,
    //     step,
    //     message : 'Expression is in normal form.',
    //     isNormalForm : true
    //   })
  
    //   setBoxState({
    //     ...state,
    //     isRunning : false,
    //     timeoutID : undefined,
    //   })
  
    //   return
    // }
  
    // // TODO: maybe refactor a little
    // const breakpoint : Breakpoint | undefined = breakpoints.find(
    //   (breakpoint : Breakpoint) =>
    //     this.shouldBreak(breakpoint, normal.nextReduction)
    // )

    // if (breakpoint !== undefined) {
    //   // TODO: consider immutability
    //   if (normal.nextReduction instanceof Expansion) {
    //     breakpoint.broken.add(normal.nextReduction.target)
    //   }
    //   if (normal.nextReduction instanceof Beta && normal.nextReduction.redex.left instanceof Lambda) {
    //     breakpoint.broken.add(normal.nextReduction.redex.left.argument)
    //   }

    //   window.clearTimeout(timeoutID)
    //   reportEvent('Evaluation Run Ended', 'Breakpoint was reached', ast.toString())


    //   setBoxState({
    //     ...state,
    //     isRunning : false,
    //     timeoutID,
    //   })

    //   return
    // }
  
    // ast = normal.perform()

    // history[history.length - 1] = { ast, lastReduction, step : step + 1, message : '', isNormalForm }

    // // NOTE: Same thing as #0023
    // // if (ast instanceof Macro || ast instanceof ChurchNumeral) {
    // //   history[history.length - 1] = { ast, lastReduction, step : step + 1, message : 'Expression is in normal form.', isNormalForm : true }

    // //   reportEvent('Evaluation Run Ended', 'Step Normal Form Reached with Number or Macro', ast.toString())
    // // }
    
    // setBoxState({
    //   ...state,
    //   timeoutID : window.setTimeout(this.onRun, timeout)
    // })
  }

  onStop () : void {
    // const { state, setBoxState } = this.props
    // const { timeoutID } = state
  
    // window.clearTimeout(timeoutID)
  
    // setBoxState({
    //   ...state,
    //   isRunning : false,
    //   timeoutID : undefined
    // })
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
  parseExpression (expression : string) : AST {
    // const { macroTable } = this.props

    const { SLI : singleLetterVars } = this.props.state

    const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars })
    const ast : AST = parse(tokens, this.props.macroContext.macrotable) // macroTable

    return ast
  }
}