import {
    BinaryExprNode,
    CallNode,
    ColourType,
    CompositeNode,
    DefineNode,
    ReduceNode,
    FuncNode,
    IfNode,
    InnerNode,
    LambdaNode,
    LetNode,
    BindNode,
    LispASTVisitor,
    MainNode,
    OperatorNode,
    StringNode,
    TopNode,
    ListNode,
    UnaryExprNode,
    ValueNode,
    VarNode,
    Instruction,
    BeginNode
} from "@lambdulus/tiny-lisp-core";
import { QuoteNode } from "@lambdulus/tiny-lisp-core/dist/AST/AST";
import React, {MouseEvent} from "react";

import './styles/Step.css'

export default class ReactTreePrinter extends LispASTVisitor{
    private rendered : JSX.Element | null = null
    private parentColoured: boolean = false
    private lowestEndNode: boolean = false
    private lookAtPredecessors: boolean = true
    private quoted = false
    private tabs: Array<JSX.Element> = []

    constructor(public readonly node: TopNode, public mouseOver: (node: InnerNode) => void, public mouseLeft: () => void) {
        super()
        node.accept(this)
    }

    public print(): JSX.Element | null{
        return this.rendered
    }

    private handleMouseOver = (e: MouseEvent<HTMLSpanElement>, node: InnerNode) => {
        console.log("MOUSE OVER: ", node)
        e.preventDefault()
        this.mouseOver(node)
    }
    private handleMouseLeft = (e: MouseEvent<HTMLSpanElement>) => {
        e.preventDefault()
        this.mouseLeft()
    }

    private addTab(){
        this.tabs.push(<span> &nbsp;&nbsp;&nbsp;&nbsp; </span>)
    }

    private removeTab(){
        this.tabs.pop()
    }

    onBinaryExprNode(node: BinaryExprNode): void {
        if(this.parentColoured){
            node.operator().accept(this)
            let rend1 = this.rendered
            node.left().accept(this)
            let rend2 = this.rendered
            node.right().accept(this)
            let rend3 = this.rendered
            console.log("BIN 0")
            this.rendered = <span className="#">
                {'('}
                {rend1}
                {' '}
                {rend2}
                {' '}
                {rend3}
                {')'}
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true
            node.operator().accept(this)
            let rend1 = this.rendered
            node.left().accept(this)
            let rend2 = this.rendered
            node.right().accept(this)
            let rend3 = this.rendered
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = false
            if (node.colour === ColourType.Current) {
                console.log("BIN 1")
                this.rendered = <span className="#">
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'('}
                    </span>
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node.operator())}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend1}
                    </span>
                    {' '}
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.left())}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend2}
                    </span>
                    {' '}
                    <span className="underlineSecondArgument" onMouseOver={e => this.handleMouseOver(e, node.right())}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend3}
                    </span>
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {')'}
                    </span>
                </span>
            }
            else if (node.colour === ColourType.Coloured) {
                console.log("BIN 2")
                this.rendered = <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node)}
                                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('}
                    {rend1}
                    {' '}
                    {rend2}
                    {' '}
                    {rend3}
                    {')'}
                </span>
            }
            else {
                console.log("BIN 3")
                this.rendered = <span className="#">
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('}
                </span>
                <span className="#" >
                    {rend1}
                </span>
                    {' '}
                    <span className="#">
                    {rend2}
                </span>
                    {' '}
                    <span className="#">
                    {rend3}
                </span>
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {')'}
                </span>
            </span>
            }
            if(node.colour === ColourType.Current)
                this.parentColoured = false
        }
    }

    onCompositeNode(node: CompositeNode): void {
        let acc: Array<JSX.Element> = []
        node.items().forEach(item => {
            item.accept(this)
            if (this.rendered) {
                acc.push(this.rendered)
                acc.push(<span>
                    {' '}
                </span>)
            }
            else
                throw Error()
        })
        acc.slice(0, -1)//remove last ' '
        if(this.quoted)
            this.rendered = <span>
                ({acc})
            </span>
        else
            this.rendered = <span>
                {acc}
            </span>
    }

    onReduceNode(node: ReduceNode): void {
        //if(this.parentColoured || !node.next.isLeaf()) {
            node.original().accept(this)
            let rend = this.rendered
            this.rendered = <span className="#">
                {rend}
            </span>
        /*}
        else {
            this.parentColoured = true
            node.next.accept(this)
            this.parentColoured = false
            let rend = this.rendered
            this.rendered = <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                                  onMouseLeave={e => this.handleMouseLeft(e)}>
                {rend}
            </span>
        }*/
    }

    onFuncNode(node: FuncNode): void {
        if(this.parentColoured){
            node.func().accept(this)
            let rend1 = this.rendered
            node.args().accept(this)
            let rend2 = this.rendered
            this.rendered = <span className="#">
                {'('}
                {rend1}
                {' '}
                {rend2}
                {')'}
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true
            node.func().accept(this)
            let rend1 = this.rendered
            node.args().accept(this)
            let rend2 = this.rendered
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = false
            if (node.colour === ColourType.Current) {
                this.rendered = <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)}
                                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('}
                    {rend1}
                    {' '}
                    {rend2}
                    {')'}
                </span>
            }
            else if (node.colour === ColourType.Coloured) {
                this.rendered = <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node)}
                                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('}
                    {rend1}
                    {' '}
                    {rend2}
                    {')'}
                </span>
            }
            else {
                this.rendered = <span className="#">
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'('}
                    </span>
                    {rend1}
                    {' '}
                    {rend2}
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {')'}
                    </span>
                </span>
            }
        }
        this.removeTab()
        this.removeTab()
    }

    onIfNode(node: IfNode): void {
        this.addTab()
        let tab = this.tabs.map(tab => Object.assign({}, tab))
        if(this.parentColoured){
            node.condition().accept(this)
            let rend1 = this.rendered
            node.left().accept(this)
            let rend2 = this.rendered
            node.right().accept(this)
            let rend3 = this.rendered
            this.rendered = <span className="#">
                {"(if "}
                {rend1}
                <br></br>
                {tab}
                {rend2}
                <br></br>
                {tab}
                {rend3}
                )
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true
            node.condition().accept(this)
            let rend1 = this.rendered
            node.left().accept(this)
            let rend2 = this.rendered
            node.right().accept(this)
            let rend3 = this.rendered
            if (node.colour === ColourType.Current) {
                this.rendered = <span className="#">
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {"(if "}
                    </span>
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.condition())}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend1}
                    </span>
                    <br></br>
                    {tab}
                    <span className="underlineSecondArgument" onMouseOver={e => this.handleMouseOver(e, node.left())}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend2}
                    </span>
                    <br></br>
                    {tab}
                    <span className="underlineThirdArgument" onMouseOver={e => this.handleMouseOver(e, node.right())}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend3}
                    </span>
                    )
                </span>
            }
            else if (node.colour === ColourType.Coloured) {
                console.log("IF 2")
                this.rendered = <span className="#">
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        {"(if "}
                        {rend1}
                        <br></br>
                        {tab}
                        {rend2}
                        <br></br>
                        {tab}
                        {rend3}
                        )
                    </span>
                </span>
            }
            else {
                this.rendered = <span className="#">
                    <span onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        {"(if "}
                    </span>
                    {rend1}
                    <br></br>
                    {tab}
                    {rend2}
                    <br></br>
                    {tab}
                    {rend3}
                    <span onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        )
                    </span>

                </span>
            }
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = false
        }
        this.removeTab()
    }

    onLambdaNode(node: LambdaNode): void {
        console.log("Lambda Node: ", node)
        this.addTab()
        let tab = this.tabs.map(tab => Object.assign({}, tab))
        if(this.parentColoured){
            node.vars().accept(this)
            let rend1 = this.rendered
            node.body().accept(this)
            let rend2 = this.rendered
            this.rendered =
                <span>
                    {'(lambda ('}
                    {rend1}
                    {')'}
                    <br></br>
                    {tab}
                    {rend2}
                    {')'}
                </span>
        }
        else {
            this.parentColoured = true
            node.vars().accept(this)
            let rend1 = this.rendered
            this.parentColoured = false
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true
            node.body().accept(this)
            let rend2 = this.rendered
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = false
            if (node.colour === ColourType.Current) {
                this.rendered =
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'(lambda ('}
                        {rend1}
                        {')'}
                        <br></br>
                        {tab}
                        {rend2}
                        {')'}
                </span>
            } else if (node.colour === ColourType.Coloured) {
                this.rendered =
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'(lambda ('}
                        {rend1}
                        {')'}
                        <br></br>
                        {tab}
                        {rend2}
                        {')'}
                </span>
            }
            else {
                this.rendered = <span className="#">
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'(lambda ('}
                        {rend1}
                        {')'}
                    </span>
                    <br></br>
                    {tab}
                    {rend2}
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                    {')'}
                </span>
            </span>
            }
        }
        this.removeTab()
    }

    onTopNode(node: TopNode): void {
        let acc: Array<JSX.Element> = []
        node.functions.forEach(func => {
            func.accept(this)
            if (this.rendered) {
                acc.push(this.rendered)
                acc.push(<br></br>)
            }
        })
        node.node.accept(this)
        this.rendered = <span>
            {acc}
            {this.rendered}
        </span>
    }

    onMainNode(node: MainNode) {
        node.node.accept(this)
    }

    onDefineNode(node: DefineNode): void {
        if (node.colour === ColourType.Current || node.colour === ColourType.Coloured)
            this.parentColoured = true
        node.vars().accept(this)
        let rend1 = this.rendered
        node.body().accept(this)
        let rend2 = this.rendered
        if (node.colour === ColourType.Current || node.colour === ColourType.Coloured)
            this.parentColoured = false
        let name = node.name
        let defineStr = node.isMacro ? 'define-macro' : 'define'
        if(node.colour === ColourType.Current){
            this.rendered = <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('+ defineStr + ' '}
                    {node.name}
                    {'('}
                    {rend1}
                    {')'}
                    <ul id="horizontal-list">
                        {rend2}
                        {'))'}
                    </ul>
            </span>
        }
        else if(node.colour === ColourType.Coloured){
            this.rendered = <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {'('+ defineStr + ' '}
                {node.name}
                {'('}
                {rend1}
                {')'}
                <ul id="horizontal-list">
                        {rend2}
                    {'))'}
                    </ul>
            </span>
        }
        else {
            this.rendered = <div>
                        <span className="#">
                            <span onMouseOver={e => this.handleMouseOver(e, node)}
                                  onMouseLeave={e => this.handleMouseLeft(e)}>
                                {'('+ defineStr + ' '}
                                {name}
                            </span>
                            (
                            {rend1}
                            )
                            <ul id="horizontal-list">
                                {rend2}
                                )
                            </ul>
                </span>
            </div>
        }
    }

    onLetNode(node: LetNode) {
        console.log("JSEM V LETU")
        this.addTab()
        let tab = this.tabs.map(tab => Object.assign({}, tab))
        if(this.parentColoured){
            node.bindings().accept(this)
            let rend1 = this.rendered
            node.body().accept(this)
            let rend2 = this.rendered
            this.rendered = <span className="#">
                {'(let' + (node.recursive ? 'rec' : '') + '('}
                {rend1}
                {')'}
                <br></br>
                {tab}
                {rend2}
                {')'}
            </span>
        }
        else {
            if(node.colour === ColourType.Current)
                this.parentColoured = true
            node.bindings().accept(this)
            let rend1 = this.rendered
            node.body().accept(this)
            let rend2 = this.rendered
            if (node.colour === ColourType.Current) {
                this.rendered = <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)}
                                      onMouseLeave={e => this.handleMouseLeft(e)}>
                <span className="#">
                    {'(let' + (node.recursive ? 'rec' : '') + '('}
                    {rend1}
                    </span>
                    {')'}
                    <br></br>
                    {tab}
                    {rend2}
                    <span className="#">
                        {')'}
                    </span>
                </span>
            }
            else {
                console.log("LET ELSE")
                this.rendered = <span className="#">
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'(let' + (node.recursive ? 'rec' : '')}
                    </span>
                    {'('}
                    {rend1}
                    {')'}
                    <br></br>
                    {tab}
                    {rend2}
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {')'}
                    </span>
                </span>
            }
            if(node.colour === ColourType.Current)
                this.parentColoured = false
        }
    }

    onCallNode(node: CallNode) {
        console.log("JSEM V CALLU")
        if(this.parentColoured){
            node.body().accept(this)
            let rend1 = this.rendered
            this.rendered = <span className="#">
                {rend1}
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true

            node.body().accept(this)
            let rend1 = this.rendered
            console.log("Colour v Callu: ", node.colour)
            if(node.colour === ColourType.Current){
                console.log("Call b1")
                this.rendered = <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend1}
                </span>
            }
            else if(node.colour === ColourType.Coloured){
                this.rendered = <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend1}
                </span>
            }
            else {
                this.rendered = <span className="#">
                    {rend1}
                </span>
            }

            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = false
        }
    }

    onUnaryExprNode(node: UnaryExprNode): void {
        let shortcut = Instruction.toString(node.operator().operator)
        if(this.parentColoured){/*
            node.operator.accept(this)
            let rend1 = this.rendered*/
            node.expr().accept(this)
            let rend2 = this.rendered
            this.rendered = <span className="#">
                {'('}
                {shortcut}
                {' '}
                {rend2}
                {')'}
            </span>
        }
        else {
            if(node.colour === ColourType.Current)
                this.parentColoured = true
            node.expr().accept(this)
            let rend2 = this.rendered
            if (node.colour === ColourType.Current) {
                this.parentColoured = true
                this.rendered = <span className="#">
                    {'('}
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        {shortcut}
                    </span>
                    {' '}
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.expr())}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend2}
                    </span>
                    {')'}
                </span>
                this.parentColoured = false
            }
            else {
                this.rendered = <span className="#">
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'('}
                        {shortcut}
                    </span>
                    {' '}
                    {rend2}
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {')'}
                    </span>
                </span>
            }
            if(node.colour === ColourType.Current)
                this.parentColoured = false
        }
    }

    onValueNode(node: ValueNode): void {
        if(this.parentColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {node.value}
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.value}
            </span>

    }

    onVarNode(node: VarNode): void {
        if(this.parentColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {node.variable}
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.variable}
            </span>
    }

    onOperatorNode(node: OperatorNode) {
        if(this.parentColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {Instruction.toString(node.operator)}
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {Instruction.toString(node.operator)}
            </span>
    }

    onListNode(node: ListNode): void {//TODO seems weird
        node.items().accept(this)
        this.parentColoured = true
        let rend = this.rendered
        this.parentColoured = false
        let apostr = "'"
        if(node.parent instanceof InnerNode)
            if(node.parent.parent instanceof ListNode)
                apostr = ""
        if(this.parentColoured) {
            this.rendered =
                <span className={ReactTreePrinter.getClassName(node)}>
                    {apostr}
                    (
                    {rend}
                    )
            </span>
        }
        else
            this.rendered =
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {apostr}
                    (
                    {rend}
                    )
            </span>
    }

    onStringNode(node: StringNode) {
        if(this.parentColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {node.str}
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                                  onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.str}
            </span>
    }

    onBeginNode(node: BeginNode){
        node.items().accept(this)
        let rend = this.rendered
        if(this.parentColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {'(begin '}
                {rend}
                {')'}
            </span>
        else {
            this.rendered = <span>
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                                  onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'(begin '}
                </span>
                {rend}
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {')'}
                </span>
            </span>
        }
    }


    onQuoteNode(node: QuoteNode){
        this.quoted = true
        if(this.parentColoured) {
            node.node().accept(this)
            let rend = this.rendered
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                `{rend}
            </span>
        }
        else {
            if(node.colour !== ColourType.None)
                this.parentColoured = true
            node.node().accept(this)
            let rend = this.rendered
            if(node.colour !== ColourType.None)
                this.parentColoured = false
            this.rendered = <span>
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    `
                </span>
                {rend}
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>

                </span>
            </span>
        }
        this.quoted = false
    }


    onCommaNode(node: QuoteNode){
        if(this.parentColoured) {
            node.node().accept(this)
            let rend = this.rendered
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                ,{rend}
            </span>
        }
        else {
            if(node.colour !== ColourType.None)
                this.parentColoured = true
            node.node().accept(this)
            let rend = this.rendered
            if(node.colour !== ColourType.None)
                this.parentColoured = false
            this.rendered = <span>
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    ,
                </span>
                {rend}
            </span>
        }
    }

    
    onBindNode(node: BindNode){
        node.variable().accept(this)
        let rend = this.rendered
        node.binded().accept(this)
        let rend2 = this.rendered
        this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {"("}
                {rend}
                {" "}
                {rend2}
                {")"}
            </span>
    }

    private static getClassName(node: InnerNode): string{
        console.log(node.colour)
        switch (node.colour){
            case ColourType.Current:
                return "underlineCurrent"
            case ColourType.Coloured:
                return "underlineFirstArgument"
            case ColourType.SecondColoured:
                return "underlineSecondArgument"
            case ColourType.ThirdColoured:
                return "underlineThirdArgument"
            case ColourType.None:
            case ColourType.Return:
            default:
                return "normalInstruction"
        }
    }

}