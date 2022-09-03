import { BoxType, BoxState } from "../Types"


export interface NoteState extends BoxState {
  __key : string
  type : BoxType
  note : string
  isEditing : boolean
}

export function createNewMarkdown () : NoteState {
  return {
    __key : Date.now().toString(),
    type : BoxType.MARKDOWN,
    title : 'Markdown Box',
    minimized : false,
    settingsOpen : false,
    note : '',
    isEditing : true,
    editor : {
      placeholder : PromptPlaceholder,
      content : '',
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