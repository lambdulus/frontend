import React, { PureComponent } from 'react'

import {
  AST,
  ASTReduction,
  None,
  Token,
  tokenize,
  parse,
  OptimizeEvaluator,
  MacroMap,
} from "@lambdulus/core"

import './styles/EvaluatorBox.css'

import { BoxType } from '../Types'

import { TreeComparator } from './TreeComparator'
import InactiveEvaluator from './InactiveExpression'
import Expression from './Expression'
import { PromptPlaceholder, UntypedLambdaState, Evaluator, StepRecord, Breakpoint, UntypedLambdaType, UntypedLambdaExpressionState, StepMessage, StepValidity } from './Types'
import { reportEvent } from '../misc'
import { strategyToEvaluator, findSimplifiedReduction, MacroBeta, toMacroMap, tryMacroContraction } from './AppTypes'


export interface EvaluationProperties {
  state : UntypedLambdaExpressionState
  isActive : boolean
  isFocused : boolean
  darkmode : boolean

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
    this.onSimplifiedExerciseStep = this.onSimplifiedExerciseStep.bind(this)
    this.onStep = this.onStep.bind(this)
    this.onSimplifiedStep = this.onSimplifiedStep.bind(this)
    this.onExecute = this.onExecute.bind(this)
    this.onRun = this.onRun.bind(this)
    this.onStop = this.onStop.bind(this)
    this.shouldBreak = this.shouldBreak.bind(this)
    this.createBoxFrom = this.createBoxFrom.bind(this)
  }

  render () : JSX.Element {
    const { state, isActive, addBox, darkmode } : EvaluationProperties = this.props
    const {
      minimized,
      history,
      breakpoints,
      editor,
      SDE,
      macrotable,
    } : UntypedLambdaExpressionState = state

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
        darkmode={ darkmode }

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
      SDE,
      expandStandalones,
      macrotable,
    } : UntypedLambdaExpressionState = state
    const { ast } = stepRecord
    const content = ast.toString()

    return {
      __key : Date.now().toString(),
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
      SLI,
      expandStandalones,
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

    if (content === '') {
      this.onStep()
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
      const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
      
      if (evaluator.nextReduction instanceof None) {
        isNormal = true
        message.message = 'Expression is in normal form.'
        
        reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
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

      reportEvent('Submit Expression', 'submit valid', content)
    } catch (exception) {
      let errorMessage : string = "Something is wrong with your expression. Please inspect it closely."
      console.error((exception as Error).toString())

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

      reportEvent('Submit Expression', 'submit invalid', content)
    }
  }

  onSimplifiedExerciseStep () {
    const { state, setBoxState } = this.props
    const { strategy, history, editor : { content }, macrotable, SLI } = state

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

        reportEvent('Exercise Step', 'Step Already in normal form', content)

        return
      }
    
      const newast : AST = ast.clone()
      let [nextReduction, evaluateReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(newast, strategy, macrotable)
      // const normal : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
      // lastReduction = normal.nextReduction
    
      if (nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(newast)

        if (etaEvaluator.nextReduction instanceof None) {
          // TODO: refactor PLS - update history
          // TODO: say user it is in normal form and they are mistaken
          stepRecord.isNormalForm = true
          stepRecord.message.message = 'Expression is already in normal form.'
          
          setBoxState({
            ...state,
          })
  
          reportEvent('Simplified Exercise Step', 'Step Already in Normal Form', content)
          
          return
        }

        ast = etaEvaluator.perform()
        // console.log("next step ale dala se udelat eta", ast.toString(), userAst.toString())
        lastReduction = etaEvaluator.nextReduction
      }
      else {
        ast = evaluateReduction(newast)
      }

      let isNormal = false

      {

        const astCopy : AST = ast.clone()
        const [nextReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(astCopy, strategy, macrotable)
        // const astCopy : AST = ast.clone()
        // const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
        
        if (nextReduction instanceof None) {
          const etaEvaluator : Evaluator = new OptimizeEvaluator(astCopy)

          if (etaEvaluator.nextReduction instanceof None) {
            isNormal = true
            reportEvent('Simplified Evaluation Step', 'Step Normal Form Reached', ast.toString())  
          }
        }
      }
    
      let message : StepMessage = { validity : StepValidity.CORRECT, userInput : content, message : '' }
      const comparator : TreeComparator = new TreeComparator([ userAst, ast ], [ newMacrotable, macrotable ])

      if (comparator.equals) {
        ast = userAst
        message.message = 'Correct.'

        reportEvent('Exercise Step', 'Valid Step', content)
      }
      else {
        // TODO: say user it was incorrect
        // TODO: na to se pouzije uvnitr EvaluatorState prop messages nebo tak neco
        // console.log('Incorrect step')
        message.message = `Incorrect step. ${content}`
        message.validity = StepValidity.INCORRECT

        reportEvent('Exercise Step', 'Invalid Step', content)
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
      // TODO: print syntax error
      // TODO: do it localy - no missuse of onSubmit

      // TODO: print syntax error

      reportEvent('Exercise Step', 'Syntax error in Step', content)
    }


    ///////////////////////////////////////////////////////////////////////////////////////////
  }

  onExerciseStep () {
    // console.log('EXERCISE STEP')
    const { state, setBoxState } = this.props
    const { strategy, history, editor : { content }, SDE, macrotable, SLI } = state
    
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

        reportEvent('Exercise Step', 'Step Already in normal form', content)

        return
      }
    
      let evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
      lastReduction = evaluator.nextReduction
    
      if (evaluator.nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

        if (etaEvaluator.nextReduction instanceof None) {
          // TODO: refactor PLS - update history
          // TODO: say user it is in normal form and they are mistaken
          stepRecord.isNormalForm = true
          stepRecord.message.message = 'Expression is already in normal form.'
          
          setBoxState({
            ...state,
          })
  
          reportEvent('Exercise Step', 'Step Already in Normal Form', content)
          
          return
        }

        evaluator = etaEvaluator
        lastReduction = etaEvaluator.nextReduction

      }
    
      ast = evaluator.perform()

      let isNormal = false

      {
        const astCopy : AST = ast.clone()
        const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
        
        if (evaluator.nextReduction instanceof None) {
          const etaEvaluator : Evaluator = new OptimizeEvaluator(astCopy)

          if (etaEvaluator.nextReduction instanceof None) {
            isNormal = true

            reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
          }
        }
      }
    
      let message : StepMessage = { validity : StepValidity.CORRECT, userInput : content, message : '' }
      const comparator : TreeComparator = new TreeComparator([ userAst, ast ], [ newMacrotable, macrotable ])

      if (comparator.equals) {
        ast = userAst
        message.message = 'Correct.'

        reportEvent('Exercise Step', 'Valid Step', content)
      }
      else {
        // TODO: say user it was incorrect
        // TODO: na to se pouzije uvnitr EvaluatorState prop messages nebo tak neco
        // console.log('Incorrect step')
        message.message = `Incorrect step. ${content}`
        message.validity = StepValidity.INCORRECT

        reportEvent('Exercise Step', 'Invalid Step', content)
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
      // TODO: print syntax error
      // TODO: do it localy - no missuse of onSubmit

      // TODO: print syntax error

      reportEvent('Exercise Step', 'Syntax error in Step', content)
    }
  }

  onSimplifiedStep () : void {
    // console.log("DOIN ONE STEP       _______     SIMPLIFIED")
    // console.log('simplified step')


    const { state, setBoxState } = this.props
    const { strategy, history, editor : { content }, macrotable } = state
    const stepRecord = history[history.length - 1]
    const { isNormalForm, step } = stepRecord
    const ast = stepRecord.ast.clone()
    let newast = ast

    if (isNormalForm) {
      return
    }

    // console.log('looooooooooooooooooooooooooooking')

    //                                                    fix this part please
    let [nextReduction, evaluateReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(ast, strategy, macrotable)
    // console.log('BACK TO THE WORLD HERE')
    
    let message : StepMessage = { validity : StepValidity.CORRECT, userInput : content, message : '' }
    let isNowNormalForm = false

    // console.log(nextReduction)

    if (nextReduction instanceof MacroBeta) {
      // console.log("YES MACRO BETA HERE")
      // z macrobeta si vytahnu aritu makra
      const arity : number = nextReduction.arity

      // a zkontroluju jestli velikost pole odpovida arite
      if (nextReduction.applications.length !== arity) {
        // pokud arita nesedi - je vetsi nez delka pole aplikaci -->
        // --> musim vyhlasit warning a rict, ze tenhle krok neni uplne gooda
        // console.log("ARITY IS WRONG - probably too few arguments")
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
        // debugger

        // if we are not ::single-step --> findSimplifiedReduction won't return MacroBeta -- instead
        // it will return the first redex --> first beta reduction in the list and then it's not macro reduction problem anymore
        // so next consecutive redex search will just find pretty normal situation as it probably should
      }
    }
    else if (nextReduction instanceof None) {
      const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

      if (etaEvaluator.nextReduction instanceof None) {
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
      // console.log('copak se tohle vubec neprovadi????????????????')
      const astCopy : AST = newast.clone()
      const [nextReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(astCopy, strategy, macrotable)
      // const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
      
      if (nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(astCopy)

        if (etaEvaluator.nextReduction instanceof None) {
          isNowNormalForm = true
          message.message = 'Expression is in normal form.'
          
          reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
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

    reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())
    return
    
    // {
    //   // None
    //   // console.log("_________________________________ NONE")
    //   // stepRecord.isNormalForm = true
    //   // stepRecord.message = 'Expression is in normal form.'
      
    //   // setBoxState({
    //   //   ...state,
    //   // })
      
    //   // reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())

    //   // return
    // }
    // {
    //   // Expansion -> then None
    //   // stepRecord.lastReduction = newreduction
    //   // stepRecord.isNormalForm = true
    //   // stepRecord.message = 'Expression is in normal form.'
      
    //   // setBoxState({
    //   //   ...state,
    //   // })
      
    //   // reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())

    //   // return
    // }
    // {
    //   // Expandion -> then Any ASTReduction inside the expanded Macro --> need to Expand first
    //   // ast = newAst

    //   // let message = ''
    //   // let isNormal = false

    //   // setBoxState({
    //   //   ...state,
    //   //   history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal } ]
    //   // })
    //   // return
    // }
    // {
    //   // Expansion -> then Any ASTReduction completely outside of Macro --> skip the Expansion and do the next thing instead
    //   // ast = newevaluator.perform()
    //   // const p = parent as AST
    //   // const ts = treeSide as String
    //   // (p as any)[ts as any] = M
    //   // // parent should be not-null
    //   // // because if there was a Macro which we were able to Expand
    //   // // and then there has been found Redex which is not part of the newly expanded sub-tree
    //   // // the new Redex simply has to be in different part of the tree --> which means - M (original Macro) is not the root

    //   // let message = ''
    //   // let isNormal = false

    //   // setBoxState({
    //   //   ...state,
    //   //   history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal } ]
    //   // })
    //   // return
    // }
  }

  onStep () : void {
    // console.log('DOIN ONE STEP')
    const { state, setBoxState } = this.props
    const { strategy, history, SDE } = state
    const stepRecord = history[history.length - 1]
    const { isNormalForm, step } = stepRecord
    let { ast, lastReduction } = stepRecord
    ast = ast.clone()
  
    if (isNormalForm) {
      // console.log('normal form bro')
      
      return
    }

    if (SDE) {
      this.onSimplifiedStep()
      return
    }

    console.log('normal step')

    let evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
    lastReduction = evaluator.nextReduction
  
    if (evaluator.nextReduction instanceof None) {
      const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

      if (etaEvaluator.nextReduction instanceof None) {
        // console.log('NEXT IS NONE')
        stepRecord.isNormalForm = true
        stepRecord.message.message = 'Expression is in normal form.'
        
        setBoxState({
          ...state,
        })
        
        reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())
  
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
      const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
      
      if (evaluator.nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

        if (etaEvaluator.nextReduction instanceof None) {
          isNormal = true
          message.message = 'Expression is in normal form.'
          
          reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
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
    //   console.log('CURRENT IS MACRO OR NUMBER')

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

    reportEvent('Exercise Empty Evaluation Step', 'Step', ast.toString())
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
  parseExpression (expression : string, macrotable : MacroMap) : AST {
    console.log('parsing expression ', expression)
    // const { macrotable } = this.props.macroContext
    console.log('my macrotable ', macrotable)

    const { SLI : singleLetterVars } = this.props.state

    const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars, macromap : macrotable })
    const ast : AST = parse(tokens, macrotable) // macroTable

    return ast
  }
}