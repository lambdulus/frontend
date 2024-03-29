import { CODE_NAME as UNTYPED_CODE_NAME, decodeUntypedLambdaState } from './untyped-lambda-integration/Constants'
import { defaultSettings as UntypedLambdaDefaultSettings } from './untyped-lambda-integration/Constants'

import { BoxType, Screen, AppState, GlobalSettings, NotebookState, BoxState } from "./Types"
import { UntypedLambdaState } from './untyped-lambda-integration/Types'
import { Theme } from './contexts/Theme'


export const CLEAR_WORKSPACE_CONFIRMATION : string =
`This will erase all of your boxes and reset all of your settings.

                                          Are you sure?`


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

export const DefaultSettings : GlobalSettings
  = { [UNTYPED_CODE_NAME] : UntypedLambdaDefaultSettings }


export const InitNotebookState : NotebookState = {
  boxList : [],
  activeBoxIndex : NaN,
  focusedBoxIndex : undefined,
  settings : DefaultSettings,

  menuOpen : false,

  __key : Date.now().toString(),
}

export const EmptyAppState : AppState = {
  notebook : InitNotebookState,
  currentScreen : Screen.MAIN,
  theme : Theme.Light
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
      console.error(`Error while loading app state from the storage.\n\n${e}`)

      return EmptyAppState
    }
  }
}

export function updateAppStateToStorage (state : AppState) : void {
  localStorage.setItem('AppState', JSON.stringify(state))
}

export function updateNotebookStateToStorage (notebook : NotebookState) {
  const state : AppState = loadAppStateFromStorage()

  state.notebook = notebook

  updateAppStateToStorage(state)
}

// TODO: This function is going to be replaced with correct implementation of decoding
// this slowly becomes better and better base for the final implementation
/**
 * This function THROWS Error in case of invalid argument
 * @param state : Deserialized form of AppState
 */
export function decode (state : AppState) : AppState | never {
  const notebook : NotebookState = decodeNotebook(state.notebook)
  
  return {
    ...state,
    notebook,
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
