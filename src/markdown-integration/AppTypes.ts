import { BoxType, AbstractBoxState } from "../Types"


export interface NoteState extends AbstractBoxState {
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
    title : 'Click Here to Change the Title',
    minimized : false,
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

export function onMarkDownBlur (state : NoteState) : NoteState {
  return {
    ...state,
    isEditing: false,
  }
}