
import { AbstractBoxState, AbstractSettings, BoxType } from "../Types"
import {InnerNode, InstructionShortcut, InterpreterState} from "@lambdulus/tiny-lisp-core";


export interface TinyLispState extends AbstractBoxState {
  __key : string
  type : BoxType
  
  expression : string //
  mouseOver: InnerNode | null // node where the mouse currently hovers over
  cleanNeeded: boolean
  interpreterState : InterpreterState | null // interpreter
  errorMsg: string | null
  subtype: TinyLispType //Type of the box

  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null // Value of an error
  }
  current: InstructionShortcut // current instruction shortcut
}


export interface TinyLispSettings extends AbstractSettings {

}

export enum TinyLispType {
  EMPTY = 'EMPTY',
  ORDINARY = 'ORDINARY',
  PARSER_ERROR = 'PARSER_ERROR'
}