export enum BoxType {
  LAMBDA,
  LISP,
  MARKDOWN,
}

export interface Box {
  type : BoxType,
  __key : number, 
}

export interface LambdaBox extends Box {
  // some data
}

export interface LispBox extends Box {
  // some data
}

export type BoxState = LambdaBox | LispBox | NoteState // or other things in the future

export interface AppState {
  boxList : Array<BoxState>,
  activeBoxIndex : number,
}



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