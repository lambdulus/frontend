import { BoxType, AbstractBoxState } from "../Types"
import { uniqueKey } from "../uniqueKey"


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
    __key : uniqueKey(),
    type : BoxType.MARKDOWN,
    title : 'Markdown Box',
    minimized : false,
    settingsOpen : false,
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

export function resetMarkdownBox (state : NoteState) : NoteState {
  return {
    ...state,
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

export function onMarkDownActive (state : NoteState) : NoteState {
  return {
    ...state,
    isEditing : true,
  }
}