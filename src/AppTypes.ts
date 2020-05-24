import { UntypedLambdaState, CODE_NAME as UNTYPED_CODE_NAME, StepRecord } from "./untyped-lambda-integration/AppTypes"
import { defaultSettings as UntypedLambdaDefaultSettings } from './untyped-lambda-integration/AppTypes'

import { BoxType, Screen, BoxesWhitelist, AppState, GlobalSettings, NotebookState, BoxState } from "./Types"
import { AST, decodeFast as decodeUntypedLambdaFast, ASTReduction } from "@lambdulus/core"


// TODO: when building `Exam Mode` simply leave only non-evaluative BoxTypes
export const ALL_BOX_TYPES : Array<BoxType> = [ BoxType.UNTYPED_LAMBDA, BoxType.LISP, BoxType.MARKDOWN ]

export const ANY_BOX = -1

export const NO_BOX = -2

export const DEFAULT_WHITELIST : BoxesWhitelist = ALL_BOX_TYPES


export function mapBoxTypeToStr (type : BoxType) : string {
  switch (type) {
    case BoxType.UNTYPED_LAMBDA:
      return 'untypedLambdaBox'

    case BoxType.MARKDOWN:
      return 'markDownBox'
    default:
      return ''
  }
}


export const EmptyAppState : AppState = {
  notebookList : [{
    boxList : [],
    activeBoxIndex : NaN,
    focusedBoxIndex : undefined,
    allowedBoxes : ANY_BOX,
    __key : Date.now().toString(),
    settings : getDefaultSettings(DEFAULT_WHITELIST)
  }],
  currentNotebook : 0,
  currentScreen : Screen.MAIN,
}


export function updateSettingsInStorage (settings : GlobalSettings) : void {
  window.localStorage.setItem('global-settings', JSON.stringify(settings))
}

export function getDefaultSettings (whitelist : BoxesWhitelist) : GlobalSettings {
  let defaultSettings = {}

  if (whitelist === NO_BOX) {
    whitelist = []
  }
  else if (whitelist === ANY_BOX) {
    whitelist = ALL_BOX_TYPES
  }

  for (const type of whitelist) {
    switch (type) {
      case BoxType.UNTYPED_LAMBDA:
        defaultSettings = {
          ...defaultSettings,
          [UNTYPED_CODE_NAME] : UntypedLambdaDefaultSettings,
        }
        break;
    
      default:
        break;
    }
  }

  return defaultSettings
}

export function loadSettingsFromStorage () : GlobalSettings {
  const defaultSettings = {
    [UNTYPED_CODE_NAME] : {}
  }

  const serialized : string | null = window.localStorage.getItem('global-settings')
  const deserialized : GlobalSettings =  serialized === null ? defaultSettings : JSON.parse(serialized)

  
  for (const [key, value] of Object.entries(deserialized)) {
    switch (key) {
      case UNTYPED_CODE_NAME:
        deserialized[key] = { ...UntypedLambdaDefaultSettings, ...value }
        break;
    
      default:
        console.error("Settings CODE NAME is not one of known Code Names.")
        break;
    }
  }

  return deserialized
}


export function loadAppStateFromStorage () : AppState {
  const maybeState : string | null = localStorage.getItem('AppState')

  if (maybeState === null) {
    localStorage.setItem('AppState', JSON.stringify(EmptyAppState))
    return EmptyAppState
  }
  else {
    try {
      return decode(JSON.parse(maybeState))
    }
    catch (e) {
      return EmptyAppState
    }
  }
}

export function updateAppStateToStorage (state : AppState) : void {
  localStorage.setItem('AppState', JSON.stringify(state))
}

// TODO: This function is going to be replaced with correct implementation of decoding
// this slowly becomes better and better base for the final implementation
/**
 * This function THROWS Error in case of invalid argument
 * @param state : Deserialized form of AppState
 */
function decode (state : AppState) : AppState | never {
  const notebookList : Array<NotebookState> = state.notebookList.map((notebook : NotebookState) => {
    const boxList : Array<BoxState> = notebook.boxList.map((box : BoxState, index : number, arr : Array<BoxState>) => {
      switch (box.type) {
        case BoxType.UNTYPED_LAMBDA: {
          const untypedLambdaBox : UntypedLambdaState = box as UntypedLambdaState

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
          untypedLambdaBox.history = untypedLambdaBox.history.map((step : StepRecord, iindex : number) => {
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
      
        default:
          return box
      }
    })

    return {
      ...notebook,
      boxList,
    }
  })
  
  return {
    ...state,
    notebookList,
  }
}