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

export type BoxesWhitelist = Array<BoxType> | AnyBox | NoBox

export interface AbstractBoxState {
  type : BoxType,
  __key : string, 
  title : String,
}