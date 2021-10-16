
import { BoxType } from "../Types";
import { TinyLispSettings, TinyLispState } from "./Types"


export const ADD_BOX_LABEL = '+ Lisp Expression'

export const CODE_NAME = 'TINY_LISP'


export function createNewTinyLispExpression (defaultSettings : TinyLispSettings) : TinyLispState {
  return {
    __key : Date.now().toString(),
    type : BoxType.LISP,
    title : '',
    minimized : false,
    menuOpen : false,
    settingsOpen : false,


    expression : '',

    editor : {
      placeholder : '',
      content : '',
      caretPosition : -1,
      syntaxError : null,
    }
  };
}
