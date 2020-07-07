import { BoxType } from '../Types'
import { EvaluationStrategy, UntypedLambdaState, UntypedLambdaSettings, UntypedLambdaType, StepRecord, UntypedLambdaExpressionState, UntypedLambdaMacroState, PromptPlaceholder, UntypedLambdaIntegrationState } from "./Types"
import { ASTReduction, AST, decodeFast as decodeUntypedLambdaFast } from '@lambdulus/core'

// import macroctx from './MacroContext'

// NOTE: let instead of const just for now
export let UNTYPED_LAMBDA_INTEGRATION_STATE : UntypedLambdaIntegrationState = {
  macrotable : {}
}

export const ADD_BOX_LABEL = '+λ'

export const CODE_NAME = 'UNTYPED_LAMBDA_CALCULUS'

export const defaultSettings : UntypedLambdaSettings = {
  type : BoxType.UNTYPED_LAMBDA,
  SLI : false,
  expandStandalones : false,
  strategy : EvaluationStrategy.NORMAL
}

export function createNewUntypedLambdaExpression (defaultSettings : UntypedLambdaSettings) : UntypedLambdaExpressionState {
  return {
    ...defaultSettings,
    __key : Date.now().toString(),
    type : BoxType.UNTYPED_LAMBDA,
    subtype : UntypedLambdaType.ORDINARY,
    title : "Untyped λ Expression",
    minimized : false,
    menuOpen : false,
    settingsOpen : false,
    expression : "",
    ast : null,
    history : [],
    isRunning : false,
    breakpoints : [],
    timeoutID : undefined,
    timeout : 5,
    
    // strategy : EvaluationStrategy.NORMAL,
    // singleLetterNames : false,
    // standalones : false,

    macrolistOpen : false,
    macrotable : { ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable },

    
    editor : {
      placeholder : "placeholder",
      content : "",
      caretPosition : 0,
      syntaxError : null,
    }
  }
}

// TODO: Implement
export function createNewUntypedLambdaExercise (defaultSettings : UntypedLambdaSettings) : UntypedLambdaState {
  return null as any
}

// TODO: Implement
export function createNewUntypedLambdaMacro (defaultSettings : UntypedLambdaSettings) : UntypedLambdaMacroState {
  return (
    {
      ...defaultSettings,
      __key : Date.now().toString(),
      type : BoxType.UNTYPED_LAMBDA,
      title : "Untyped λ Macro Expression",
      minimized : false,
      menuOpen : false,
      settingsOpen : false,
    
      subtype : UntypedLambdaType.MACRO,
      expression : '',
      ast : null,
      macroName : '',
      macroExpression : '',

      macrolistOpen : false,
      macrotable : { ...UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable },

      
      editor : {
        placeholder : PromptPlaceholder.MACRO,
        content : '',
        caretPosition : 0,
        syntaxError : null
      }
    }
  )
}


export function decodeUntypedLambdaState (box : UntypedLambdaState) : UntypedLambdaState {
  switch (box.subtype) {
    case UntypedLambdaType.ORDINARY:
      return decodeUntypedLambdaExpression(box as UntypedLambdaExpressionState)
      
    case UntypedLambdaType.MACRO:
      return box //TODO: implement

    case UntypedLambdaType.EXERCISE:
      return box //TODO: implement
  }
}

function decodeUntypedLambdaExpression (box : UntypedLambdaExpressionState) : UntypedLambdaExpressionState {
  const untypedLambdaBox : UntypedLambdaExpressionState = box as UntypedLambdaExpressionState

  if (untypedLambdaBox.expression === '') {
    return untypedLambdaBox
  }
  
  const decodedFirst : AST | null = decodeUntypedLambdaFast(untypedLambdaBox.ast)

  if (decodedFirst === null) {
    // TODO: repair:
    // parse expression
    // replace untypedLambdaBox.ast with parsed AST
    // for now - throw error
    throw "ROOT AST IS NOT DECODABLE"
  }

  untypedLambdaBox.ast = decodedFirst
  untypedLambdaBox.history = untypedLambdaBox.history.map((step : StepRecord, index : number) => {
    let decodedNth : AST | null = decodeUntypedLambdaFast(step.ast) as AST

    if (decodedNth === null) {
      // TODO: repair:
      // try to take previous Step.ast and do the evaluation
      // though - remember this Step.step (number) may not be + 1 of the previous one
      // you will need to do the steps as long as need to be
      // replace decodedNth with parsed AST
      // for throw
      throw "CURRENT STEP IS NOT DECODABLE " + index
    }

    // TODO: maybe instead of this theatre just use the Core . Evalautor
    // and get real instance of ASTReduction
    let reduction : ASTReduction | undefined | null = step.lastReduction

    if (step.lastReduction === undefined) {
      reduction = null
    }

    return {
      ...step,
      lastReduction : reduction,
      ast : decodedNth, // TODO: as AST this is unsafe
    }
  })

  return untypedLambdaBox
}