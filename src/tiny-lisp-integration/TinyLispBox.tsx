import React, {PureComponent} from 'react'
import {ColourType, DefineNode, ReduceNode, InnerNode, Interpreter, MainNode, Parser, TopNode, VarNode, LexerError, InterpreterError, ParserError, SyntaxError} from '@lambdulus/tiny-lisp-core'

import {TinyLispState, TinyLispType} from './Types'
import Editor from "../components/Editor";
import ReactSECDPrinter from "./ReactSECDPrinter";
import ReactTreePrinter from "./ReactTreePrinter";
import { Painter } from './Painter';


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
        this.onRun = this.onRun.bind(this)
        this.onMouseOver = this.onMouseOver.bind(this)
        this.onMouseLeft = this.onMouseLeft.bind(this)
        this.hasMouseOver = this.hasMouseOver.bind(this)
        this.parentHasMouseOver = this.parentHasMouseOver.bind(this)
    }

    render () {
        const { state } : Props = this.props
        const { interpreter, subtype } : TinyLispState = state
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
                        throw Error
                    }
                    //print source code
                    const staticLisp = new ReactTreePrinter(interpreter.state.topNode, this.onMouseOver, this.onMouseLeft).print()
                    //print code register
                    const c = new ReactSECDPrinter(interpreter.state.code, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    //print stack register
                    const s = new ReactSECDPrinter(interpreter.state.stack, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    //print environment register
                    const e = new ReactSECDPrinter(interpreter.state.environment, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    //print dump register
                    const d = new ReactSECDPrinter(interpreter.state.dump, this.hasMouseOver, this.parentHasMouseOver, state.current).print()
                    //set printedState of all arrays in registers to None
                    interpreter.state.code.clearPrinted()
                    interpreter.state.stack.clearPrinted()
                    interpreter.state.environment.clearPrinted()
                    interpreter.state.dump.clearPrinted()
                    return (
                        <div>
                            LISP:
                            <br></br>
                            { staticLisp }
                            <br></br>
                            <br></br>
                            code: { c }
                            <br></br>
                            <br></br>
                            stack: { s }
                            <br></br>
                            <br></br>
                            environment: { e }
                            <br></br>
                            <br></br>
                            dump: { d }
                            <br></br>
                            <br></br>
                            <button
                                title='do step in the evaluator'
                                type="button"
                                className='open-as-debug btn'
                                onClick={ this.onStep }
                            >
                          <span
                              className='tiny-lisp--step--btn-label'
                          >
                            Step
                          </span>
                            </button>
                            <button
                                title='run the evaluator'
                                type="button"
                                className='open-as-debug btn'
                                onClick={ this.onRun }
                            >
                          <span
                              className='tiny-lisp--run--btn-label'
                          >
                            Run
                          </span>
                            </button>

                        </div>
                    )
                case TinyLispType.PARSER_ERROR:
                    return (
                    <div>
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
                        <br></br>
                        <br></br>
                        {this.props.state.errorMsg}
                        </div>
                    )
            }
        }
        return renderBoxContent()
    }

    onDebug(): void{
        try {
            //Parse the source code and start an interpreter with parse code
            let parser = new Parser()
            let arr = parser.parse(this.props.state.editor.content)
            let interpreter = new Interpreter(arr, parser.topNode as TopNode)
            this.props.setBoxState({...this.props.state, subtype: TinyLispType.ORDINARY, interpreter,})
        }
        catch (exception) {
            //If there is an error, render the error msg
            let msg = "Error while parsing: "
            if(exception instanceof ParserError || exception instanceof SyntaxError || exception instanceof LexerError){
                msg += exception.value
            }
            this.props.setBoxState({
                ...this.props.state,
                errorMsg: msg,
                subtype: TinyLispType.PARSER_ERROR,
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
        try {
            interpreter.step()//Perform step of the interpreter
            let painter = new Painter(interpreter.state)
            painter.colourArray(interpreter.lastInstruction)//Colour registers
            let current = interpreter.lastInstruction.shortcut//Update last instruction
            setBoxState({...state, interpreter, current})
        }
        catch (error){
            if(error instanceof InterpreterError){//If error caught, update the error message
                setBoxState({...state, subtype: TinyLispType.PARSER_ERROR, errorMsg: error.value})
            }
        }
    }

    onRun() : void {
        const { state, setBoxState } : Props = this.props
        const { interpreter } : TinyLispState = state
        if(interpreter == null){
            throw Error
        }
        try {
            interpreter.run()
            new Painter(interpreter.state).clean()
            setBoxState({...state, interpreter})
        }
        catch (error){
            if(error instanceof InterpreterError){
                setBoxState({...state, subtype: TinyLispType.PARSER_ERROR, errorMsg: error.value})
            }
        }
    }

    /**
     *
     * @param node
     */

    onMouseOver(node: InnerNode): void{
        if(this.props.state.cleanNeeded)
            if(this.props.state.mouseOver)
                this.props.state.mouseOver.colour = ColourType.None
        let tmp = node
        let i = 0
        let colour = node.colour
        while (tmp.hasParent()){//Find predecessor ReduceNode so reduced values can be coloured
            let tmp2 = tmp._parent
            if(tmp2 instanceof TopNode || tmp2 instanceof MainNode)
                break
            tmp2 = tmp._parent as InnerNode
            if(tmp2.colour !== ColourType.None)
                break
            if(tmp2 instanceof ReduceNode)
                node = tmp2
            tmp = tmp2 as InnerNode
            if(i ++ > 10)
                break
        }
        let cleanNeaded = false
        if(node.colour === ColourType.None) {//If predecessor node is chosen, it should have the same colour
            node.colour = colour
            cleanNeaded = true
        }
        this.props.setBoxState({...this.props.state, mouseOver: node, cleanNeeded: cleanNeaded})
    }

    /**
     * Set the mouseOver to null, when leaving a node
     */

    onMouseLeft(): void{
        if(this.props.state.cleanNeeded)
            if(this.props.state.mouseOver)
                this.props.state.mouseOver.colour = ColourType.None
        this.props.setBoxState({...this.props.state, mouseOver: null, cleanNeeded: false})
    }

    /**
     * True if mouseOver is not null
     */

    hasMouseOver(): boolean{
        return this.props.state.mouseOver != null
    }

    /**
     * Checks if parent of the node is the mouseOver
     * @param node
     * @param returnTrueIfColoured If the mouseOver node is coloured, return true
     */

    parentHasMouseOver(node: InnerNode, returnTrueIfColoured: boolean): boolean {
        //If mouseOver not defined
        if(typeof(this.props.state.mouseOver) == "undefined" || !this.props.state.mouseOver)
            return false
        // colour not None and returnTrueIfColoured false
        if(!returnTrueIfColoured && this.props.state.mouseOver.colour !== ColourType.None)
            return false
        return this.parentHasMouseOverCont(node)
    }

    /**
     * Checks if parent of the node is the mouseOver
     * @param node
     * @private
     */

    private parentHasMouseOverCont(node: InnerNode): boolean {
        //If node is call of the function in mouseOver
        if (this.props.state.mouseOver instanceof DefineNode && node instanceof VarNode){
            if(this.props.state.mouseOver.name === node.variable){
                return true
            }
        }
        let mouseOverNode = this.props.state.mouseOver
        if(node === mouseOverNode) {//If node is the mouseOver node
            return true
        }
        if(node instanceof ReduceNode){//If original is the mouseOver node
            if(node.original() === mouseOverNode){
                return true
            }
        }
        let parent = node._parent
        if(!(parent instanceof InnerNode)) {//If on top
            return false
        }
        return this.parentHasMouseOverCont(parent)//Call on parent
    }
}