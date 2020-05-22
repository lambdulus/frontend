import { UntypedLambdaState, UntypedLambdaSettings } from "./untyped-lambda-integration/AppTypes"
import { NoteState } from "./markdown-integration/AppTypes"

export enum BoxType {
  UNTYPED_LAMBDA,
  LISP,
  MARKDOWN,
}

export enum Screen {
  MAIN,
  HELP,
  MACROLIST,
  SETTINGS,
  // NOTEBOOKS,
}

export type AnyBox = -1

export type NoBox = -2

// TODO: when building `Exam Mode`  allow only Array<BoxType> or NoBox
export type BoxesWhitelist = Array<BoxType> | AnyBox | NoBox

export interface AbstractBoxState {
  type : BoxType,
  __key : string, 
  title : String,
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
  boxList : Array<BoxState>,
  activeBoxIndex : number,
  allowedBoxes : BoxesWhitelist,

  settings : GlobalSettings // TODO: refactor to use the Dictionary

  __key : string
}

export interface AppState {
  notebookList : Array<NotebookState>,
  currentNotebook : number,
  currentScreen : Screen,
}


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



