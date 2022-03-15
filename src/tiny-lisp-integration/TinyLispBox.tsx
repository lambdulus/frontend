import React, {PureComponent} from 'react'
import {ColourType, DefineNode, EndNode, InnerNode, Instruction, Interpreter, MainNode, Parser, TopNode, VarNode} from '@lambdulus/tiny-lisp-core'

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
        const { state } : Props = this.props
        const { interpreter, subtype } : TinyLispState = state
        console.log("ZACINA RENDER")
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
                        <button
                            title='Submit this Expression in the Evaluator (Ctrl + Enter)'
                            type="button"
                            className='open-as-debug btn'
                            onClick={ this.onDebug }
                        >
                          <span
                              className='tiny-lisp--submit-expression--btn-label'
                          >
                            Submit
                          </span>
                        </button>
                    </div>

                case TinyLispType.ORDINARY:
                    if(interpreter == null){
                        throw Error//TODO zmenit asi na log a vratit neco v poradku - jinak crashne cela appka
                    }
                    const staticLisp = new ReactTreePrinter(interpreter.topNode, this.onMouseOver, this.onMouseLeft).print()
                    console.log("ZACINA CODE: ", this.hasMouseOver)
                    const c = new ReactSECDPrinter(interpreter.code, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    console.log("ZACINA STACK")
                    const s = new ReactSECDPrinter(interpreter.stack, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    console.log("ZACINA ENVIRONMENT: ", this.hasMouseOver)
                    const e = new ReactSECDPrinter(interpreter.environment, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    console.log("ZACINA DUMP: ", this.hasMouseOver)
                    const d = new DumpPrinter(interpreter.dump, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    console.log("*****$$$$$", interpreter.code)
                    interpreter.code.clearPrinted()
                    console.log("*****$$$$$", interpreter.code)
                    interpreter.stack.clearPrinted()
                    interpreter.environment.clearPrinted()
                    interpreter.dump.clearPrinted()
                    console.log("DEBUG--------------------------!!!!!!!!!!!!!!!!!!!!!!!!------------------------")
                    return (
                        <div>
                            LISP:
                            <br></br>
                            { staticLisp }
                            <span className="toRight">
                                stack: { s }

                            </span>
                            <br></br>
                            code: { c }

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
                              className='tiny-lisp--debug-expression--btn-label'
                          >
                            Step
                          </span>
                            </button>
                        </div>
                    )
            }
        }
        return renderBoxContent()
    }

    onDebug(): void{
        try {
            let parser = new Parser()
            let arr = parser.parse(this.props.state.editor.content)
            let interpreter = new Interpreter(arr, parser.topNode as TopNode)
            this.props.setBoxState({...this.props.state, subtype: TinyLispType.ORDINARY, interpreter,})
        }
        catch (exception) {
            this.props.setBoxState({
                ...this.props.state,
                editor : {
                    ...this.props.state.editor,
                    syntaxError : Error("Error when parsing"),
                }
            })
        }
    }

    onContent(str: string): void{
        this.props.setBoxState({...this.props.state, editor: {...this.props.state.editor, content: str}})
    }

    onStep() : void {
        const { state, setBoxState } : Props = this.props
        const { interpreter } : TinyLispState = state
        if(interpreter == null){
            throw Error
        }
        console.log("Interpreter On Step", interpreter)
        console.log("$$$$", interpreter.lastInstruction)
        interpreter.detectAction()
        console.log("$$$$", interpreter.lastInstruction)
        let current = (interpreter.lastInstruction.val as unknown as Instruction).shortcut
        interpreter.code.clearPrinted()
        interpreter.stack.clearPrinted()
        interpreter.dump.clearPrinted()
        interpreter.environment.clearPrinted()
        console.log("Interpreter After Step", interpreter)
        setBoxState({...state, interpreter, current})
    }

    onMouseOver(node: InnerNode): void{
        console.log("Interpreter1: ", this, node)
        let tmp = node
        let i = 0
        let colour = node.colour
        while (tmp.hasParent()){
            let tmp2 = tmp._parent
            console.log("TMP NODE", tmp, tmp2)
            if(tmp2 instanceof TopNode || tmp2 instanceof MainNode)
                break
            tmp2 = tmp._parent as InnerNode
            if(tmp2.colour !== ColourType.None)
                break
            if(tmp2 instanceof EndNode)
                if(tmp2.reduced().isLeaf())
                    node = tmp2
            tmp = tmp2 as InnerNode
            if(i ++ > 10)
                break
        }
        node.colour = colour//If predecessor node is chosed it should have the same colour
        this.props.setBoxState({...this.props.state, mouseOver: node})
        //console.log("Hazim tam: ", {...this.props.state, mouseOver: node})
        console.log("Props a node: ", this.props, node)
    }

    onMouseLeft(): void{
        this.props.setBoxState({...this.props.state, mouseOver: null})
        //console.log("Hazim tam: ", {...this.props.state, mouseOver: null})
    }

    hasMouseOver(): boolean{
        return this.props.state.mouseOver != null
    }

    parentHasMouseOver(node: InnerNode, returnTrueIfColoured: boolean): boolean {//TODO optimize
        console.log("IN parentHasMouseOver method", node, this.props.state.mouseOver, returnTrueIfColoured)
        if(typeof(this.props.state.mouseOver) == "undefined" || !this.props.state.mouseOver)
            return false
        if(!returnTrueIfColoured && this.props.state.mouseOver.colour !== ColourType.None)
            return false//TODO optimize
        if (this.props.state.mouseOver instanceof DefineNode && node instanceof VarNode){
            if(this.props.state.mouseOver.name === node.variable){
                console.log("RETURNING TRUE", node.variable)
                return true
            }
        }
        let condNode = this.props.state.mouseOver
        if(node === condNode) {
            console.log("RETURNING TRUE")
            return true
        }
        let parent = node._parent
        if(!(parent instanceof InnerNode)) {
            console.log("RETURNING FALSE")
            return false
        }
        return this.parentHasMouseOver(parent, returnTrueIfColoured)
    }

}
//{ renderBoxContent() }