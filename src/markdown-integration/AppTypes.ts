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

export function topHeadingTitle (content : string) : string | null {
  // A level-1 heading (`#`, exactly one) on the very first line lends its
  // text to the box title. Anything else (H2+, heading further down,
  // `#nospace`, empty) leaves the title alone.
  const firstLine : string = content.split(/\r?\n/)[0] ?? '';
  const match : RegExpMatchArray | null = firstLine.match(/^\s{0,3}#\s+(.+?)\s*$/);
  if (match === null) {
    return null;
  }
  const title : string = match[1].replace(/\s+#+$/, '').trim();
  return title === '' ? null : title;
}

export function onMarkDownBlur (state : NoteState) : NoteState {
  const heading : string | null = topHeadingTitle(state.editor.content);
  return {
    ...state,
    isEditing: false,
    title : heading ?? state.title,
  }
}

export function onMarkDownActive (state : NoteState) : NoteState {
  return {
    ...state,
    isEditing : true,
  }
}