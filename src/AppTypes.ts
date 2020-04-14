import { UntypedLambdaState } from "./untyped-lambda-integration/AppTypes"

export enum BoxType {
  UNTYPED_LAMBDA,
  LISP,
  MARKDOWN,
}

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
  activeBoxIndex : number
}

export enum Screen {
  MAIN,
  HELP,
  MACROLIST,
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