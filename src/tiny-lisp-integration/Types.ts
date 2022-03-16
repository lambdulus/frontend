import { AbstractBoxState, AbstractSettings } from "../Types"
import {InnerNode, InstructionShortcut, Interpreter} from "@lambdulus/tiny-lisp-core";


export interface TinyLispState extends AbstractBoxState {
  expression : string
  mouseOver: InnerNode | null
  cleanNeeded: boolean
  interpreter : Interpreter | null
  subtype: TinyLispType

  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
  current: InstructionShortcut
}

export interface TinyLispSettings extends AbstractSettings {

}

export enum TinyLispType {
  EMPTY = 'EMPTY',
  ORDINARY = 'ORDINARY'
}