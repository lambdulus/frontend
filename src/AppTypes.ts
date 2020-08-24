import {  CODE_NAME as UNTYPED_CODE_NAME, decodeUntypedLambdaState, UNTYPED_LAMBDA_INTEGRATION_STATE } from './untyped-lambda-integration/AppTypes'
import { defaultSettings as UntypedLambdaDefaultSettings } from './untyped-lambda-integration/AppTypes'

import { BoxType, Screen, BoxesWhitelist, AppState, GlobalSettings, NotebookState, BoxState } from "./Types"
import { UntypedLambdaState } from './untyped-lambda-integration/Types'


export const CLEAR_WORKSPACE_CONFIRMATION : string =
`This will delete this whole Notebook from your browser's memory.

                                          Are you sure?`

// TODO: when building `Exam Mode` simply leave only non-evaluative BoxTypes
export const ALL_BOX_TYPES : Array<BoxType> = [ BoxType.UNTYPED_LAMBDA, BoxType.LISP, BoxType.MARKDOWN ]

export const ANY_BOX = -1

export const NO_BOX = -2

export const DEFAULT_WHITELIST : BoxesWhitelist = [ BoxType.UNTYPED_LAMBDA, BoxType.MARKDOWN ]


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

export const InitNotebookState : NotebookState = {
  boxList : [],
  activeBoxIndex : NaN,
  focusedBoxIndex : undefined,
  allowedBoxes : DEFAULT_WHITELIST,
  settings : getDefaultSettings(DEFAULT_WHITELIST),
  integrationStates : {
    'UNTYPED_LAMBDA' : UNTYPED_LAMBDA_INTEGRATION_STATE, // TODO: FIX THIS!!!
  },

  locked : false,
  menuOpen : false,

  __key : Date.now().toString(),
  name : "Default Ntbk",
  editingName : false,
  persistent : true,
}

export const EmptyAppState : AppState = {
  notebookList : [ InitNotebookState ],
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

export function updateNotebookStateToStorage (notebook : NotebookState, index : number) {
  if ( ! notebook.persistent) {
    return
  }

  const state : AppState = loadAppStateFromStorage()

  state.notebookList[index] = notebook

  updateAppStateToStorage(state)
}

// TODO: This function is going to be replaced with correct implementation of decoding
// this slowly becomes better and better base for the final implementation
/**
 * This function THROWS Error in case of invalid argument
 * @param state : Deserialized form of AppState
 */
export function decode (state : AppState) : AppState | never {
  const notebookList : Array<NotebookState> = state.notebookList.map(decodeNotebook)
  
  return {
    ...state,
    notebookList,
  }
}

export function decodeNotebook (notebook : NotebookState) : NotebookState | never {
  const boxList : Array<BoxState> = notebook.boxList.map((box : BoxState, index : number, arr : Array<BoxState>) => {
    switch (box.type) {
      case BoxType.UNTYPED_LAMBDA: {
        return decodeUntypedLambdaState(box as UntypedLambdaState)
      }

      //TODO: implement for other Box Types
    
      default:
        return box
    }
  })

  return {
    ...notebook,
    boxList,
  }
}

export function initIntegrationStates (appState : AppState) {
  const { currentNotebook, notebookList } : AppState = appState
  const notebook = notebookList[currentNotebook]

  for (const [key, value] of Object.entries(notebook.integrationStates)) {
    switch (key) {
      case BoxType.UNTYPED_LAMBDA: {
        value.macrotable = UNTYPED_LAMBDA_INTEGRATION_STATE.macrotable  // TODO: this is very informed - should be done by specific integration - leaving just for now
        return
      }
    
      default:
        break;
    }
  }
}