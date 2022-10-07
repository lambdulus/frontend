import {  CODE_NAME as UNTYPED_CODE_NAME, decodeUntypedLambdaState } from '../untyped-lambda-integration/AppTypes'
import { defaultSettings as UntypedLambdaDefaultSettings } from '../untyped-lambda-integration/AppTypes'

import { BoxType, AppState, GlobalSettings, NotebookState, BoxState } from '../Types'
import { UntypedLambdaState } from '../untyped-lambda-integration/Types'
import { EmptyAppState } from '../Constants'



export function updateSettingsInStorage (settings : GlobalSettings) : void {
  window.localStorage.setItem('global-settings', JSON.stringify(settings))
}

export function getDefaultSettings () : GlobalSettings {
  return { [UNTYPED_CODE_NAME] : UntypedLambdaDefaultSettings, }
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
      console.error(`Error while loading app state from the storage.\n\n${e}`)

      return EmptyAppState
    }
  }
}

export function updateAppStateToStorage (state : AppState) : void {
  localStorage.setItem('AppState', JSON.stringify(state))
}

export function updateNotebookStateToStorage (notebook : NotebookState, index : number) {
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