import { InstructionShortcut } from "@lambdulus/tiny-lisp-core";
import { BoxType } from "../Types";
import { TinyLispSettings, TinyLispState, TinyLispType } from "./Types"

export const ADD_BOX_LABEL = '+ Lisp Expression'

export const CODE_NAME = 'TINY_LISP'


export function createNewTinyLispExpression (defaultSettings : TinyLispSettings) : TinyLispState {
    return {
        __key : Date.now().toString(),
        type : BoxType.LISP,
        title : 'New Tiny Lisp Expression',
        minimized : false,
        menuOpen : false,
        settingsOpen : false,

        subtype: TinyLispType.EMPTY,
        expression : '',
        mouseOver: null,
        cleanNeeded: false,
        interpreter: null,

        editor : {
            placeholder : '',
            content : '',
            caretPosition : -1,
            syntaxError : null,
        },
        current : InstructionShortcut.DUMMY
    };
}
