import { UntypedLambdaState, UntypedLambdaSettings } from "./untyped-lambda-integration/Types"
import { NoteState } from "./markdown-integration/AppTypes"

export enum BoxType {
  UNTYPED_LAMBDA = 'UNTYPED_LAMBDA',
  LISP = 'LISP',
  MARKDOWN = 'MARKDOWN',
}

export enum Screen {
  MAIN,
  HELP,
  SETTINGS,
  NOTEBOOKS, // TODO: this will be the final solution to the `Multiple Notebooks` problem
}

export interface AbstractBoxState {
  type : BoxType,
  __key : string, 
  title : String,
  minimized : boolean,
  settingsOpen : boolean,
}

export interface AbstractSettings {
  type : BoxType,
}

export interface LispBox extends AbstractBoxState {
  // TODO: delete this placeholder and implement it
}

export interface LispSettings extends AbstractSettings {
  // TODO: delete this placeholder and implement it
}

export type BoxState = UntypedLambdaState | LispBox | NoteState // or other things in the future

export type Settings = UntypedLambdaSettings | LispSettings // or other things in the future

// TODO: this needs to be reconsidered
export interface GlobalSettings {
  // [UNTYPED_CODE_NAME] : UntypedLambdaSettings
  [key : string] : Settings
}

export interface NotebookState {
  boxList : Array<BoxState>
  activeBoxIndex : number
  focusedBoxIndex : number | undefined

  locked : boolean
  menuOpen : boolean

  settings : GlobalSettings // TODO: refactor to use the Dictionary

  __key : string
  editingName : boolean
}

export interface AppState {
  notebookList : Array<NotebookState>,
  currentNotebook : number,
  currentScreen : Screen,
  darkmode : boolean
}
