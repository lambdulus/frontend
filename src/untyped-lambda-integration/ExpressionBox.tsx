import React, { PureComponent } from 'react'

import {
  AST,
  ASTReduction,
  None,
  Beta,
  Lambda,
  Variable,
  Expansion,
  ChurchNumeral,
  Macro,
  OptimizeEvaluator,
  ASTReductionType,
} from "@lambdulus/core"

import './styles/EvaluatorBox.css'

import { BoxType } from '../Types'

import InactiveEvaluator from './InactiveExpression'
import Expression from './Expression'
import { PromptPlaceholder, UntypedLambdaState, Evaluator, StepRecord, Breakpoint, UntypedLambdaType, UntypedLambdaExpressionState, StepMessage, StepValidity } from './Types'
import { findSimplifiedReduction, MacroBeta, tryMacroContraction, strategyToEvaluator } from './Constants'


export interface EvaluationProperties {
  state : UntypedLambdaExpressionState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : UntypedLambdaExpressionState) : void
  addBox (box : UntypedLambdaState) : void
}

export default class ExpressionBox extends PureComponent<EvaluationProperties> {
  constructor (props : EvaluationProperties) {
    super(props)

    this.onContent = this.onContent.bind(this)
    this.onSimplifiedStep = this.onSimplifiedStep.bind(this)
    this.onStep = this.onStep.bind(this)
    this.onExecute = this.onExecute.bind(this)
    this.onRun = this.onRun.bind(this)
    this.onStop = this.onStop.bind(this)
    this.shouldBreak = this.shouldBreak.bind(this)
    this.createBoxFrom = this.createBoxFrom.bind(this)
    this.onSimplifiedRun = this.onSimplifiedRun.bind(this)
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
    } : UntypedLambdaExpressionState = state

    let className : string = 'box boxEval'
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
        isExercise={ false }
        state={ state }
        breakpoints={ breakpoints }
        history={ history }
        editor={ editor }
        isNormalForm={ isNormalForm }
        shouldShowDebugControls={ isActive }

        createBoxFrom={ this.createBoxFrom }
        setBoxState={ this.props.setBoxState }
        onContent={ this.onContent }
        onEnter={ this.onStep }
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
      settingsOpen : true,
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
      macrotable : { },
      editor : {
        placeholder : PromptPlaceholder.EVAL_MODE,
        content : Object.entries(macrotable).map(([name, definition] : [string, string]) => name + ' := ' + definition + ' ;\n' ).join('') + content,
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

  onSimplifiedStep () : void {
    // console.log("DOIN ONE STEP       _______     SIMPLIFIED")

    const { state, setBoxState } = this.props
    const { strategy, history, macrotable } = state
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
    
    let message : StepMessage = { validity : StepValidity.CORRECT, userInput : '', message : '' }
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
      console.log('first is NONE')
      const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

      if (etaEvaluator.nextReduction instanceof None) {
        console.log('second is NONE')

        stepRecord.isNormalForm = true
        stepRecord.message.message = 'Expression is in normal form.'
        setBoxState({
          ...state,
        })
        return
      }

      console.log('second is ',etaEvaluator.nextReduction)

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
        }
      }
    }

    setBoxState({
      ...state,
      history : [ ...history, { ast : newast, lastReduction : nextReduction, step : step + 1, message, isNormalForm : isNowNormalForm, exerciseStep : false } ],
    })

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
    const { strategy, SDE, history } = state

    // this is gonna change - Simplified Evaluation won't be strategy - but Strategy Modifier
    if (SDE) {
      this.onSimplifiedStep()
      return
    }

    const stepRecord = history[history.length - 1]
    const { isNormalForm, step } = stepRecord
    let { ast, lastReduction } = stepRecord
    ast = ast.clone()

  
    if (isNormalForm) {
      return
    }

    let evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
    lastReduction = evaluator.nextReduction
  
    if (evaluator.nextReduction instanceof None) {
      const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

      if (etaEvaluator.nextReduction instanceof None) {
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

    let message : StepMessage = { validity : StepValidity.CORRECT, userInput : '', message : '' }
    let isNormal = false

    {
      const astCopy : AST = ast.clone()
      const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
      
      if (evaluator.nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(astCopy)

        if (etaEvaluator.nextReduction instanceof None) {
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
    //   console.log('CURRENT IS MACRO OR NUMBER')

    //   stepRecord.isNormalForm = true
    //   stepRecord.message = 'Expression is in normal form.'

    //   reportEvent('Evaluation Step', 'Step Normal Form Reached with Number or Macro', ast.toString())
    // }
  
    setBoxState({
      ...state,
      history : [ ...history, { ast, lastReduction, step : step + 1, message, isNormalForm : isNormal, exerciseStep : false } ],

    })
  }

  onExecute () : void {
    const { state, setBoxState } = this.props
    const { isRunning, SDE } = state

    if (isRunning) {
      this.onStop()
    }
    else {
      const { timeout, history } = state
      const stepRecord = history[history.length - 1]
  
      if (stepRecord.isNormalForm) {
        return
      }
      
      const { ast, step, lastReduction, isNormalForm } = stepRecord
      let msg : StepMessage = { validity : StepValidity.CORRECT, userInput : '', message : 'Skipping some steps...' }
      history.push(history[history.length - 1])
      history[history.length - 2] = { ast : ast.clone(), step, lastReduction, message : msg, isNormalForm, exerciseStep : false }

      if (SDE) {
        setBoxState({
          ...state,
          isRunning : true,
          timeoutID : window.setTimeout(this.onSimplifiedRun, timeout),
        })
      }
      else {
        setBoxState({
          ...state,
          isRunning : true,
          timeoutID : window.setTimeout(this.onRun, timeout),
        })
      }
    }
  }

  onSimplifiedRun () : void {
    const { state, setBoxState } = this.props
    const { strategy, macrotable } = state
    let { history, isRunning, breakpoints, timeoutID, timeout } = state
    const stepRecord : StepRecord = history[history.length - 1]
    const { isNormalForm, step } = stepRecord
    let { lastReduction } = stepRecord

    if ( ! isRunning) {
      return
    }

    if (isNormalForm) {
      setBoxState({
        ...state,
        isRunning : false,
        timeoutID : undefined,
      })
  
      return
    }

    let { ast } = stepRecord
    const newast : AST = ast.clone()
    const [nextReduction, evaluateReduction] : [ASTReduction, (ast : AST) => AST] = findSimplifiedReduction(newast, strategy, macrotable)

/////////////////////////////////////////////////////////////////////////////////////////
    // const normal : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
    lastReduction = nextReduction
    
    if (nextReduction instanceof None) {
      // TODO: consider immutability
      history.pop()
      history.push({
        ast,
        lastReduction : stepRecord.lastReduction,
        step,
        message : { validity : StepValidity.CORRECT, userInput : '', message : 'Expression is in normal form.' },
        isNormalForm : true,
        exerciseStep : false,
      })
  
      setBoxState({
        ...state,
        isRunning : false,
        timeoutID : undefined,
      })
  
      return
    }

    const arityBreakpoint : Breakpoint | undefined = breakpoints.find((brk : Breakpoint) => brk.type === ASTReductionType.GAMA && ! brk.broken.has((nextReduction as MacroBeta).applications[0]))
    if (nextReduction instanceof MacroBeta && nextReduction.arity !== nextReduction.applications.length && arityBreakpoint === undefined) {
      stepRecord.message.message = `Macro ${tryMacroContraction(nextReduction.applications[0].left, macrotable)} is given too few arguments.`
    
      // completely same code as in breakpoint section -- TODO: refactor and unify pls
      window.clearTimeout(timeoutID)

      breakpoints.push({ type : ASTReductionType.GAMA, context : nextReduction.applications[0], broken : new Set([ nextReduction.applications[0] ]) })

      setBoxState({
        ...state,
        breakpoints,
        isRunning : false,
        timeoutID,
      })

      return
    }
  
    // TODO: maybe refactor a little
    const breakpoint : Breakpoint | undefined = breakpoints.find(
      (breakpoint : Breakpoint) =>
        this.shouldBreak(breakpoint, nextReduction)
    )

    if (breakpoint !== undefined) {
      // TODO: consider immutability
      if (nextReduction instanceof Expansion) {
        breakpoint.broken.add(nextReduction.target)
      }
      if (nextReduction instanceof Beta && nextReduction.redex.left instanceof Lambda) {
        breakpoint.broken.add(nextReduction.redex.left.argument)
      }

      window.clearTimeout(timeoutID)

      setBoxState({
        ...state,
        isRunning : false,
        timeoutID,
      })

      return
    }
  
    ast = evaluateReduction(newast)

    history[history.length - 1] = { ast, lastReduction, step : step + 1, message : { validity : StepValidity.CORRECT, userInput : '', message : '' }, isNormalForm, exerciseStep : false }

    // NOTE: Same thing as #0023
    // if (ast instanceof Macro || ast instanceof ChurchNumeral) {
    //   history[history.length - 1] = { ast, lastReduction, step : step + 1, message : 'Expression is in normal form.', isNormalForm : true }

    //   reportEvent('Evaluation Run Ended', 'Step Normal Form Reached with Number or Macro', ast.toString())
    // }
    
    setBoxState({
      ...state,
      timeoutID : window.setTimeout(this.onSimplifiedRun, timeout)
    })
  }

  onRun () : void {
    const { state, setBoxState } = this.props
    const { strategy } = state
    let { history, isRunning, breakpoints, timeoutID, timeout } = state
    const stepRecord : StepRecord = history[history.length - 1]
    const { isNormalForm, step } = stepRecord
    let { lastReduction } = stepRecord

    if ( ! isRunning) {
      return
    }
    
    if (isNormalForm) {
      setBoxState({
        ...state,
        isRunning : false,
        timeoutID : undefined,
      })
  
      return
    }
  
    let { ast } = stepRecord
    const normal : Evaluator = new (strategyToEvaluator(strategy) as any)(ast)
    lastReduction = normal.nextReduction
    
    if (normal.nextReduction instanceof None) {
      // TODO: consider immutability
      history.pop()
      history.push({
        ast,
        lastReduction : stepRecord.lastReduction,
        step,
        message : { validity : StepValidity.CORRECT, userInput : '', message : 'Expression is in normal form.' }, 
        isNormalForm : true,
        exerciseStep : false,
      })
  
      setBoxState({
        ...state,
        isRunning : false,
        timeoutID : undefined,
      })
  
      return
    }
  
    // TODO: maybe refactor a little
    const breakpoint : Breakpoint | undefined = breakpoints.find(
      (breakpoint : Breakpoint) =>
        this.shouldBreak(breakpoint, normal.nextReduction)
    )

    if (breakpoint !== undefined) {
      // TODO: consider immutability
      if (normal.nextReduction instanceof Expansion) {
        breakpoint.broken.add(normal.nextReduction.target)
      }
      if (normal.nextReduction instanceof Beta && normal.nextReduction.redex.left instanceof Lambda) {
        breakpoint.broken.add(normal.nextReduction.redex.left.argument)
      }

      window.clearTimeout(timeoutID)

      setBoxState({
        ...state,
        isRunning : false,
        timeoutID,
      })

      return
    }
  
    ast = normal.perform()

    history[history.length - 1] = { ast, lastReduction, step : step + 1, message : { validity : StepValidity.CORRECT, userInput : '', message : '' }, isNormalForm, exerciseStep : false }

    // NOTE: Same thing as #0023
    // if (ast instanceof Macro || ast instanceof ChurchNumeral) {
    //   history[history.length - 1] = { ast, lastReduction, step : step + 1, message : 'Expression is in normal form.', isNormalForm : true }

    //   reportEvent('Evaluation Run Ended', 'Step Normal Form Reached with Number or Macro', ast.toString())
    // }
    
    setBoxState({
      ...state,
      timeoutID : window.setTimeout(this.onRun, timeout)
    })
  }

  onStop () : void {
    const { state, setBoxState } = this.props
    const { timeoutID } = state
  
    window.clearTimeout(timeoutID)
  
    setBoxState({
      ...state,
      isRunning : false,
      timeoutID : undefined
    })
  }

  // TODO: breakpointy se pak jeste musi predelat
  // TODO: don't forget on GAMA refactor
  shouldBreak (breakpoint : Breakpoint, reduction : ASTReduction) : boolean {
    // if (reduction.type === breakpoint.type
    //     && reduction instanceof Beta && breakpoint.context instanceof Lambda
    //     && reduction.target.identifier === breakpoint.context.body.identifier
    //   ) {
    //     return true
    // }
    if (reduction.type === breakpoint.type
        && reduction instanceof Beta && breakpoint.context instanceof Variable
        && reduction.redex.left instanceof Lambda
        && reduction.redex.left.argument.identifier === breakpoint.context.identifier
        && ! breakpoint.broken.has(reduction.redex.left.argument)
    ) {
      return true
    }

    if (reduction.type === breakpoint.type
        && reduction instanceof Expansion && breakpoint.context instanceof ChurchNumeral
        && reduction.target.identifier === breakpoint.context.identifier
        && ! breakpoint.broken.has(reduction.target)
    ) {
      return true
    }
    if (reduction.type === breakpoint.type
        && reduction instanceof Expansion && breakpoint.context instanceof Macro
        && reduction.target.identifier === breakpoint.context.identifier
        && ! breakpoint.broken.has(reduction.target)
    ) {
      return true
    }
  
    return false
  }

}