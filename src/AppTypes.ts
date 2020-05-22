import { UntypedLambdaState, CODE_NAME as UNTYPED_CODE_NAME } from "./untyped-lambda-integration/AppTypes"
import { defaultSettings as UntypedLambdaDefaultSettings } from './untyped-lambda-integration/AppTypes'

import { BoxType, Screen, BoxesWhitelist, AppState, GlobalSettings, NotebookState, BoxState } from "./Types"
import { tokenize, Token, parse, AST } from "@lambdulus/core"


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
    // TODO: recursively decode AST Nodes from simple Objects
    return stripSteps(JSON.parse(maybeState))
  }
}

// TODO: this function needs to somehow take care of serialization OR I will need to take care of
// deserialization in the future - you see - AST needs to be instantiated as class
// thus simple JSON.parse won't cut it
export function updateAppStateToStorage (state : AppState) : void {
  localStorage.setItem('AppState', JSON.stringify(state))
}

// TODO: This function is going to be replaced with correct implementation of decoding
function stripSteps (state : AppState) : AppState {
  const notebookList : Array<NotebookState> = state.notebookList.map((notebook : NotebookState) => {
    const boxList : Array<BoxState> = notebook.boxList.map((box : BoxState) => {
      if (box.type === BoxType.UNTYPED_LAMBDA) {
        const b : UntypedLambdaState = box as UntypedLambdaState

        if (b.expression === '') {
          return b
        }
        
        const tokens : Array<Token> = tokenize(b.expression, { lambdaLetters : ['λ'], singleLetterVars : b.SLI })
        const ast : AST = parse(tokens, {}) // macroTable

        b.ast = ast
        b.history = [{
          ast : ast,
          lastReduction : null,
          step : 0,
          message : "",
          isNormalForm : false,
        }]
        return b
      }
      return box
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