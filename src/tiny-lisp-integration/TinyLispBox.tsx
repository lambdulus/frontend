import React, {PureComponent} from 'react'
import {Interpreter, Parser, PrintCall} from '@lambdulus/tiny-lisp-core/main'

import {TinyLispState, TinyLispType} from './Types'
import Editor from "../components/Editor";
import ReactSECDPrinter from "./ReactSECDPrinter";
import ReactTreePrinter from "./ReactTreePrinter";


interface Props {
  state : TinyLispState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : TinyLispState) : void
}

export default class TinyLispBox extends PureComponent<Props> {
  constructor (props : Props) {
    super(props)
    this.onStep = this.onStep.bind(this)
    this.onContent = this.onContent.bind(this)
      this.onDebug = this.onDebug.bind(this)
  }

  render () {
    const { state, isActive, isFocused, setBoxState } : Props = this.props
    const { expression, editor, interpreter, subtype } : TinyLispState = state
    const renderBoxContent = () => {
        switch(subtype) {
            case TinyLispType.EMPTY:
                return <div>
                    <Editor
                        placeholder={ "" } // data
                        content={ this.props.state.editor.content } // data
                        syntaxError={ null } // data
                        submitOnEnter={ false } // data
                        shouldReplaceLambda={ false }

                        onContent={ this.onContent } // fn
                        onEnter={ () => void 0 } // fn
                        onCtrlEnter={ this.onDebug }
                        onShiftEnter={ () => void 0 }
                        onExecute={ () => void 0 } // fn
                    />
                </div>

            case TinyLispType.ORDINARY:
                if(interpreter == null){
                    throw Error//TODO zmenit asi na log a vratit neco v poradku - jinak crashne cela appka
                }
                const staticLisp = new ReactTreePrinter(interpreter.topNode, PrintCall.Static).print()
                const dynamicLisp = new ReactTreePrinter(interpreter.topNode, PrintCall.Dynamic).print()
                const c = new ReactSECDPrinter(interpreter.code).print()
                const s = new ReactSECDPrinter(interpreter.stack).print()
                const e = new ReactSECDPrinter(interpreter.environment).print()
                const d = new ReactSECDPrinter(interpreter.dump).print()
                console.log("DEBUG--------------------------!!!!!!!!!!!!!!!!!!!!!!!!------------------------")
                return (
                    <div>
                        LISP: { staticLisp }
                        <br></br>
                        LISP2: { dynamicLisp }
                        <br></br>
                        code: { c }
                        <br></br>
                        stack: { s }
                        <br></br>
                        environment: { e }
                        <br></br>
                        dump: { d }
                        <br></br>
                        <button
                            title='Debug this Expression in the Evaluator (Ctrl + Enter)'
                            type="button"
                            className='open-as-debug btn'
                            onClick={ this.onStep }
                        >
                          <span
                              className='untyped-lambda--submit-expression--btn-label'
                          >
                            Debug
                          </span>
                        </button>
                    </div>
                )
        }
    }
   return renderBoxContent()
  }

  onDebug(): void{
      let interpreter = new Interpreter(new Parser().parse(this.props.state.editor.content))//TODO change
      this.props.setBoxState({...this.props.state, subtype: TinyLispType.ORDINARY, interpreter, })
  }

  onContent(str: string): void{
      this.props.setBoxState({...this.props.state, editor: {...this.props.state.editor, content: str}})
  }

  onStep() : void {
    const { state, isActive, isFocused, setBoxState } : Props = this.props
    const { expression, editor, interpreter } : TinyLispState = state
      if(interpreter == null){
          throw Error
      }
    interpreter.detectAction()
    setBoxState({...state, interpreter})
  }

}
//{ renderBoxContent() }