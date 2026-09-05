import { CODE_NAME as UNTYPED_CODE_NAME, decodeUntypedLambdaState } from './untyped-lambda-integration/Constants'
import { defaultSettings as UntypedLambdaDefaultSettings } from './untyped-lambda-integration/Constants'

import { Accent, BoxType, AppState, GlobalSettings, NotebookState, BoxState } from "./Types"
import { uniqueKey } from "./uniqueKey"
import { UntypedLambdaState } from './untyped-lambda-integration/Types'
import { createNewMarkdown, NoteState } from './markdown-integration/AppTypes'
import guideContent from './misc/UserGuide'
import { Theme } from './contexts/Theme'


export const CLEAR_NOTEBOOK_CONFIRMATION : string =
`This will erase all of your boxes in this notebook.

                                          Are you sure?`

export const RESET_WORKSPACE_CONFIRMATION : string =
`This will erase all of your notebooks and start over with the defaults.

                                          Are you really sure?`


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


export function createEmptyNotebook (name : string) : NotebookState {
  return {
    name,
    boxList : [],
    activeBoxIndex : NaN,
    focusedBoxIndex : undefined,
    settings : DefaultSettings,

    menuOpen : false,

    __key : uniqueKey(),
  }
}

export function createManualNotebook () : NotebookState {
  const manualBox : NoteState = {
    ...createNewMarkdown(),
    title : 'Manual',
    note : guideContent,
    isEditing : false,
    readOnly : true,
    editor : {
      placeholder : '',
      content : guideContent,
      caretPosition : 0,
      syntaxError : null,
    },
  }

  return {
    name : 'Manual',
    locked : true,
    boxList : [ manualBox ],
    activeBoxIndex : 0,
    focusedBoxIndex : undefined,
    settings : DefaultSettings,

    menuOpen : false,

    __key : uniqueKey(),
  }
}

export const EmptyAppState : AppState = {
  notebooks : [ createManualNotebook(), createEmptyNotebook('Notebook') ],
  activeNotebookIndex : 1,
  theme : Theme.Dark,
  accent : 'emerald',
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

export function updateNotebookStateToStorage (index : number, notebook : NotebookState) {
  const state : AppState = loadAppStateFromStorage()

  state.notebooks[index] = notebook

  updateAppStateToStorage(state)
}

// TODO: This function is going to be replaced with correct implementation of decoding
// this slowly becomes better and better base for the final implementation
/**
 * This function THROWS Error in case of invalid argument
 * @param state : Deserialized form of AppState
 */
export function decode (state : AppState) : AppState | never {
  const legacy : any = state as any

  // Migrate the pre-tabs shape (a single notebook) into two notebooks.
  if ( ! Array.isArray(legacy.notebooks) && legacy.notebook) {
    return {
      notebooks : [ createManualNotebook(), decodeNotebook(legacy.notebook) ],
      activeNotebookIndex : 1,
      theme : state.theme ?? Theme.Dark,
      accent : 'emerald',
    }
  }

  if ( ! Array.isArray(legacy.notebooks) || legacy.notebooks.length === 0) {
    return EmptyAppState
  }

  const notebooks : Array<NotebookState> = legacy.notebooks.map(decodeNotebook)
  const accent : Accent =
    legacy.accent === 'blue' || legacy.accent === 'amber' || legacy.accent === 'emerald' ?
      legacy.accent
    :
      'emerald'
  const activeNotebookIndex : number =
    typeof legacy.activeNotebookIndex === 'number'
    && legacy.activeNotebookIndex >= 0
    && legacy.activeNotebookIndex < notebooks.length ?
      legacy.activeNotebookIndex
    :
      0

  return {
    ...state,
    notebooks,
    activeNotebookIndex,
    accent,
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
    name : typeof notebook.name === 'string' && notebook.name.length > 0 ? notebook.name : 'Notebook',
    boxList,
  }
}
