import { UntypedLambdaState } from "./untyped-lambda-integration/AppTypes"

export enum BoxType {
  UNTYPED_LAMBDA,
  LISP,
  MARKDOWN,
}

export type AnyBox = -1
export const ANY_BOX = -1

export type NoBox = -2
export const NO_BOX = -2

export type BoxesWhitelist = Array<BoxType> | AnyBox | NoBox

export interface Box {
  type : BoxType,
  __key : number, 
}

export interface LispBox extends Box {
  // some data
}

export type BoxState = UntypedLambdaState | LispBox | NoteState // or other things in the future

export interface AppState {
  notebookList : Array<NotebookState>,
  currentNotebook : number,
  currentScreen : Screen,
}

export interface NotebookState {
  boxList : Array<BoxState>,
  activeBoxIndex : number,
  allowedBoxes : BoxesWhitelist,
  __key : string
}

export enum Screen {
  MAIN,
  HELP,
  MACROLIST,
  SETTINGS,
  // NOTEBOOKS,
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

// TODO: move to specific integration
export interface NoteState {
  __key : string
  type : BoxType
  note : string
  isEditing : boolean
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
}