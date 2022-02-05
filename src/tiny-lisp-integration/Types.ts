import { BoxType, AbstractBoxState, AbstractIntegrationState, AbstractSettings } from "../Types"
import {InnerNode, Interpreter} from "@lambdulus/tiny-lisp-core/main";


export interface TinyLispState extends AbstractBoxState {
  expression : string
  mouseOver: InnerNode | null
  interpreter : Interpreter | null
  subtype: TinyLispType

  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
}


export interface TinyLispSettings extends AbstractSettings {
  
}

export enum TinyLispType {
  EMPTY = 'EMPTY',
  ORDINARY = 'ORDINARY'
}