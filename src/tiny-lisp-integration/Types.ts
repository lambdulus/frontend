import { BoxType, AbstractBoxState, AbstractIntegrationState, AbstractSettings } from "../Types"


export interface TinyLispState extends AbstractBoxState {
  expression : string

  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
}


export interface TinyLispSettings extends AbstractSettings {
  
}