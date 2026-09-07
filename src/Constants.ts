import { CODE_NAME as UNTYPED_CODE_NAME, decodeUntypedLambdaState } from './untyped-lambda-integration/Constants'
import { defaultSettings as UntypedLambdaDefaultSettings } from './untyped-lambda-integration/Constants'

import { Accent, BoxStyle, BoxType, AppState, GlobalSettings, NotebookState, BoxState } from "./Types"
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

// Fresh settings per notebook: sharing one object would let an in-place
// edit leak across notebooks.
export function createDefaultSettings () : GlobalSettings {
  return { [UNTYPED_CODE_NAME] : { ...UntypedLambdaDefaultSettings } }
}


export function createEmptyNotebook (name : string) : NotebookState {
  return {
    name,
    boxList : [],
    activeBoxIndex : NaN,
    focusedBoxIndex : undefined,
    settings : createDefaultSettings(),

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
    settings : createDefaultSettings(),

    menuOpen : false,

    __key : uniqueKey(),
  }
}

// First-run theme follows the operating system when the API exists,
// dark otherwise. Stored state always wins after that; this only
// shapes fresh defaults.
export function preferredTheme () : Theme {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      return Theme.Light
    }
  }
  return Theme.Dark
}

// Fresh default workspace per call: handing out one shared const would
// alias every fresh state to the same notebooks.
export function createDefaultAppState () : AppState {
  return {
    notebooks : [ createManualNotebook(), createEmptyNotebook('Notebook') ],
    activeNotebookIndex : 1,
    theme : preferredTheme(),
    accent : 'emerald',
    boxStyle : 'cards',
  }
}


export function loadAppStateFromStorage () : AppState {
  const maybeState : string | null = localStorage.getItem('AppState')

  if (maybeState === null) {
    const fresh : AppState = createDefaultAppState()
    localStorage.setItem('AppState', JSON.stringify(fresh))
    return fresh
  }
  else {
    try {
      return decode(JSON.parse(maybeState))
    }
    catch (e) {
      console.error(`Error while loading app state from the storage.\n\n${e}`)

      return createDefaultAppState()
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
      boxStyle : 'cards',
    }
  }

  if ( ! Array.isArray(legacy.notebooks) || legacy.notebooks.length === 0) {
    return createDefaultAppState()
  }

  const notebooks : Array<NotebookState> = legacy.notebooks.map(decodeNotebook)
  const accent : Accent =
    legacy.accent === 'blue' || legacy.accent === 'amber' || legacy.accent === 'emerald' || legacy.accent === 'indigo' ?
      legacy.accent
    :
      'emerald'
  const boxStyle : BoxStyle =
    legacy.boxStyle === 'classic' ?
      'classic'
    :
      'cards'
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
    boxStyle,
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

  // Booleans are strict-compared so a corrupt value can neither lock
  // a notebook/box permanently nor silently unlock the Manual.
  const locked : boolean = notebook.locked === true
  const normalizedBoxes : Array<BoxState> = boxList.map((box : BoxState) => ({
    ...box,
    readOnly : box.readOnly === true,
  }))

  // Notebooks persisted before per-notebook settings existed (or with a
  // partial settings object) would otherwise hand undefined strategy/SLI/SDE
  // to every box created from them, and no submitted expression would ever
  // evaluate — strategyToEvaluator would get undefined and `new undefined()`
  // throws. Backfill so old notebooks behave like fresh ones.
  const storedSettings : GlobalSettings =
    typeof notebook.settings === 'object' && notebook.settings !== null ?
      notebook.settings
    :
      {}
  const storedUntyped : object =
    typeof storedSettings[UNTYPED_CODE_NAME] === 'object' && storedSettings[UNTYPED_CODE_NAME] !== null ?
      storedSettings[UNTYPED_CODE_NAME] as unknown as object
    :
      {}
  const settings : GlobalSettings = {
    ...createDefaultSettings(),
    ...storedSettings,
    [UNTYPED_CODE_NAME] : {
      ...UntypedLambdaDefaultSettings,
      ...storedUntyped,
    },
  }

  return {
    ...notebook,
    name : typeof notebook.name === 'string' && notebook.name.length > 0 ? notebook.name : 'Notebook',
    locked,
    boxList : normalizedBoxes,
    settings,
  }
}
