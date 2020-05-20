import { BoxType } from "../AppTypes";


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

export function createNewMarkdown () : NoteState {
  return {
    __key : Date.now().toString(),
    type : BoxType.MARKDOWN,
    note : '',
    isEditing : true,
    editor : {
      placeholder : PromptPlaceholder,
      content : '',
      caretPosition : 0,
      syntaxError : null
    }
  }
}

export const PromptPlaceholder : string = 'Note in MarkDown'