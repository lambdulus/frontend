import { UntypedLambdaState, UntypedLambdaSettings, CODE_NAME as UNTYPED_CODE_NAME } from "./untyped-lambda-integration/AppTypes"
import { defaultSettings as UntypedLambdaDefaultSettings } from './untyped-lambda-integration/AppTypes'

import { NoteState } from "./markdown-integration/AppTypes"
import { BoxType, Screen, BoxesWhitelist, AbstractBoxState, AbstractSettings } from "./Types"
import { tokenize, Token, parse, AST } from "@lambdulus/core"



export const ALL_BOX_TYPES : Array<BoxType> = [ BoxType.UNTYPED_LAMBDA, BoxType.LISP, BoxType.MARKDOWN ]

export const ANY_BOX = -1

export const NO_BOX = -2

export const DEFAULT_WHITELIST : BoxesWhitelist = [BoxType.UNTYPED_LAMBDA, BoxType.LISP, BoxType.MARKDOWN]


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


export interface LispBox extends AbstractBoxState {
  // TODO: delete this placeholder and implement it
}

export interface LispSettings extends AbstractSettings {
  // TODO: delete this placeholder and implement it
}

export type BoxState = UntypedLambdaState | LispBox | NoteState // or other things in the future

export type Settings = UntypedLambdaSettings | LispSettings // or other things in the future

export interface AppState {
  notebookList : Array<NotebookState>,
  currentNotebook : number,
  currentScreen : Screen,
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

// TODO: this needs to be reconsidered
export interface GlobalSettings {
  // [UNTYPED_CODE_NAME] : UntypedLambdaSettings
  [key : string] : Settings
}

export interface NotebookState {
  boxList : Array<BoxState>,
  activeBoxIndex : number,
  allowedBoxes : BoxesWhitelist,

  settings : GlobalSettings // TODO: refactor to use the Dictionary

  __key : string
}

///////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////////
// TODO: move to specific integration
export interface MacroDefinitionState {
  __key : string
  type : BoxType
  macroName : string
  macroExpression : string
  singleLetterNames : boolean
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
}

//////////////////////

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