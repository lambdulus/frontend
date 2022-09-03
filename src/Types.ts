import { UntypedLambdaSettings } from "./untyped-lambda-integration/Types"

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

export type AnyBox = -1

export type NoBox = -2

// TODO: when building `Exam Mode`  allow only Array<BoxType> or NoBox
export type BoxesWhitelist = Array<BoxType> | AnyBox | NoBox

export interface BoxState {
  type : BoxType,
  __key : string, 
  title : String,
  minimized : boolean,
  settingsOpen : boolean,

  editor : {
    placeholder : string
    content : string
    syntaxError : Error | null
  }
}

export interface AbstractSettings {
  type : BoxType,
}

export interface LispBox extends BoxState {
  // TODO: delete this placeholder and implement it
}

export interface LispSettings extends AbstractSettings {
  // TODO: delete this placeholder and implement it
}

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
  allowedBoxes : BoxesWhitelist

  locked : boolean
  menuOpen : boolean

  settings : GlobalSettings // TODO: refactor to use the Dictionary

  __key : string
  name : string
  editingName : boolean
  persistent : boolean
}

export interface AppState {
  notebookList : Array<NotebookState>,
  currentNotebook : number,
  currentScreen : Screen,
}
