export enum BoxType {
  LAMBDA,
  LISP,
  MARKDOWN,
}

export interface Box {
  type : BoxType,
  __key : string, 
}

export interface LambdaBox extends Box {
  // some data
}

export interface LispBox extends Box {
  // some data
}

export type BoxState = LambdaBox | LispBox // or other things in the future

export interface AppState {
  boxList : Array<BoxState>,
  activeBoxIndex : number,
}