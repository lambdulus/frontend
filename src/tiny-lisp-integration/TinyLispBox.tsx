import React, {PureComponent} from 'react'
import {BinaryExprNode, ColourType, InnerNode, Interpreter, Node, Parser, TopNode} from '@lambdulus/tiny-lisp-core/main'

import {TinyLispState, TinyLispType} from './Types'
import Editor from "../components/Editor";
import ReactSECDPrinter from "./ReactSECDPrinter";
import ReactTreePrinter from "./ReactTreePrinter";
import DumpPrinter from "./DumpPrinter";


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
    this.onMouseOver = this.onMouseOver.bind(this)
    this.onMouseLeft = this.onMouseLeft.bind(this)
    this.hasMouseOver = this.hasMouseOver.bind(this)
      this.parentHasMouseOver = this.parentHasMouseOver.bind(this)
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
                const staticLisp = new ReactTreePrinter(interpreter.topNode, this.onMouseOver, this.onMouseLeft).print()
                const c = new ReactSECDPrinter(interpreter.code, this.hasMouseOver, this.parentHasMouseOver).print()
                const s = new ReactSECDPrinter(interpreter.stack, this.hasMouseOver, this.parentHasMouseOver).print()
                const e = new ReactSECDPrinter(interpreter.environment, this.hasMouseOver, this.parentHasMouseOver).print()
                console.log("Funkce: ", this.hasMouseOver)
                const d = new DumpPrinter(interpreter.dump, this.hasMouseOver, this.parentHasMouseOver).print()
                interpreter.code.clearPrinted()
                interpreter.stack.clearPrinted()
                interpreter.environment.clearPrinted()
                interpreter.dump.clearPrinted()
                console.log("DEBUG--------------------------!!!!!!!!!!!!!!!!!!!!!!!!------------------------")
                return (
                    <div>
                        LISP:
                        <br></br>
                        { staticLisp }
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
      let parser = new Parser()
      let arr = parser.parse(this.props.state.editor.content)
      let interpreter = new Interpreter(arr, parser.topNode as TopNode)
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
      console.log("Interpreter On Step", interpreter)
    interpreter.detectAction()
      interpreter.code.clearPrinted()
      interpreter.stack.clearPrinted()
      interpreter.dump.clearPrinted()
      interpreter.environment.clearPrinted()
      console.log("Interpreter After Step", interpreter)
    setBoxState({...state, interpreter})
  }

  onMouseOver(node: InnerNode): void{
      console.log("Interpreter1: ", this)
      let mouseOver = this.props.state.mouseOver
      if(mouseOver !== null) {
          mouseOver.setMouseOver(false)
          console.log("Leaving node: ", mouseOver)
      }/*
      if(node instanceof BinaryExprNode)
          node = node.operator*/
      node.setMouseOver(true)
      this.props.setBoxState({...this.props.state, mouseOver: node})
      //console.log("Hazim tam: ", {...this.props.state, mouseOver: node})
      console.log("Props a node: ", this.props, node)
  }

  onMouseLeft(): void{
      //console.log("Interpreter2: ", this)
      let mouseOver = this.props.state.mouseOver
      console.log("In mouse left", mouseOver)
      if(mouseOver !== null) {
          mouseOver.setMouseOver(false)
          console.log("Levaing node: ", mouseOver)
      }
      this.props.setBoxState({...this.props.state, mouseOver: null})
      //console.log("Hazim tam: ", {...this.props.state, mouseOver: null})
  }

  hasMouseOver(): boolean{
      return this.props.state.mouseOver != null
  }

  parentHasMouseOver(node: InnerNode): boolean{
      console.log("IN parentHasMouseOver method", node, this.props.state.mouseOver)
      if(node.mouseOver) {
          console.log("RETURNING TRUE")
          return true
      }
      let parent: Node = node._parent as Node
      if(!(parent instanceof InnerNode)) {
          console.log("RETURNING FALSE")
          return false
      }
      return this.parentHasMouseOver(parent)
  }

}
//{ renderBoxContent() }