import {
    BinaryExprNode,
    CallNode,
    ColourType,
    CompositeNode,
    DefineNode,
    ReduceNode,
    ApplicationNode,
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
    UnaryExprNode,
    ValueNode,
    VarNode,
    Instruction,
    BeginNode,
    QuoteNode
} from "@lambdulus/tiny-lisp-core";
import React, {MouseEvent} from "react";

import './styles/Step.css'

/**
 * Extends LispASTVisitor class
 *
 * For each node, a check is done to see if its predecessor is coloured
 * If so it just renders the node without any additional CSS
 *
 * If not, it prepares the node to handle a mouse over it, and it looks at its colour
 *
 * If it has an expected colour, it underlines the node in source code with the colour
 *
 * Otherwise it
 */

export default class ReactTreePrinter extends LispASTVisitor{
    private rendered : JSX.Element | null = null
    private predecessorColoured: boolean = false
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
        if(this.predecessorColoured){
            node.operator().accept(this)
            let rend1 = this.rendered
            node.left().accept(this)
            let rend2 = this.rendered
            node.right().accept(this)
            let rend3 = this.rendered
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
                this.predecessorColoured = true
            node.operator().accept(this)
            let rend1 = this.rendered
            node.left().accept(this)
            let rend2 = this.rendered
            node.right().accept(this)
            let rend3 = this.rendered
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.predecessorColoured = false
            if (node.colour === ColourType.Current) {
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
                this.predecessorColoured = false
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
        acc = acc.slice(0, -1)//remove last ' '
        if(this.quoted)//If quoted add parentesess
            if(this.predecessorColoured) {
                this.rendered = <span>
                    <span onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        (
                    </span>
                    {acc}
                    <span onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        )
                    </span>
                </span>
            }
            else {
                if(node.colour === ColourType.Coloured){
                    this.predecessorColoured = true
                    this.rendered = <span className="underlineCurrent"
                        onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        ({acc})
                    </span>
                    this.predecessorColoured = false
                }
                else {
                    this.rendered = <span>
                        <span onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                            (
                        </span>
                            {acc}
                            <span onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                            )
                        </span>
                    </span>
                }
            }
        else
            this.rendered = <span>
                {acc}
            </span>
    }

    onReduceNode(node: ReduceNode): void {
        node.original().accept(this)
        let rend = this.rendered
        this.rendered = <span className="#">
            {rend}
        </span>
    }

    onApplicationNode(node: ApplicationNode): void {
        if(this.predecessorColoured){
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
                this.predecessorColoured = true
            node.func().accept(this)
            let rend1 = this.rendered
            node.args().accept(this)
            let rend2 = this.rendered
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.predecessorColoured = false
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
        if(this.predecessorColoured){
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
                this.predecessorColoured = true
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
                this.predecessorColoured = false
        }
        this.removeTab()
    }

    onLambdaNode(node: LambdaNode): void {
        this.addTab()
        let tab = this.tabs.map(tab => Object.assign({}, tab))
        if(this.predecessorColoured){
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
            this.predecessorColoured = true
            node.vars().accept(this)
            let rend1 = this.rendered
            this.predecessorColoured = false
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.predecessorColoured = true
            node.body().accept(this)
            let rend2 = this.rendered
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.predecessorColoured = false
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
        node.topLevelExprs.forEach(func => {
            func.accept(this)
            if (this.rendered) {
                acc.push(this.rendered)
                acc.push(<br></br>)
            }
        })
        this.rendered = <span>
            {acc}
        </span>
    }

    onMainNode(node: MainNode) {
        node.node.accept(this)
    }

    onDefineNode(node: DefineNode): void {//We do not need to check this node for a predecessor, since it always a top level statement
        if (node.colour === ColourType.Current || node.colour === ColourType.Coloured)
            this.predecessorColoured = true
        node.vars().accept(this)
        let rend1 = this.rendered
        node.body().accept(this)
        let rend2 = this.rendered
        if (node.colour === ColourType.Current || node.colour === ColourType.Coloured)
            this.predecessorColoured = false
        let name = node.name
        let defineStr = node.isMacro ? 'define-macro' : 'define'
        if(node.colour === ColourType.Current){
            this.rendered = <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('+ defineStr + ' ('}
                    {node.name}
                    {' '}
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
                {'('+ defineStr + ' ('}
                {node.name}
                {' '}
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
                                {'('+ defineStr + ' ('}
                                {name}
                            </span>
                            {' '}
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
        this.addTab()
        let tab = this.tabs.map(tab => Object.assign({}, tab))
        if(this.predecessorColoured){
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
                this.predecessorColoured = true
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
                this.predecessorColoured = false
        }
    }

    onCallNode(node: CallNode) {
        if(this.predecessorColoured){
            node.body().accept(this)
            let rend1 = this.rendered
            this.rendered = <span className="#">
                {rend1}
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.predecessorColoured = true

            node.body().accept(this)
            let rend1 = this.rendered
            if(node.colour === ColourType.Current){
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
                this.predecessorColoured = false
        }
    }

    onUnaryExprNode(node: UnaryExprNode): void {
        let operatorNode: InnerNode = node.operator()
        let shortcut = Instruction.toSourceCode(operatorNode instanceof ReduceNode
            ? (operatorNode.original() as OperatorNode).operator
            : (operatorNode as OperatorNode).operator)
        if(this.predecessorColoured){
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
                this.predecessorColoured = true
            node.expr().accept(this)
            let rend2 = this.rendered
            if (node.colour === ColourType.Current) {
                this.predecessorColoured = true
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
                this.predecessorColoured = false
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
                this.predecessorColoured = false
        }
    }

    onValueNode(node: ValueNode): void {
        if(this.predecessorColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {node.value}
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.value}
            </span>

    }

    onVarNode(node: VarNode): void {
        if(this.predecessorColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {node.variable}
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.variable}
            </span>
    }

    onOperatorNode(node: OperatorNode) {
        if(this.predecessorColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {Instruction.toSourceCode(node.operator)}
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {Instruction.toSourceCode(node.operator)}
            </span>
    }

    onStringNode(node: StringNode) {
        if(this.predecessorColoured)
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
        if(this.predecessorColoured)
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
        let changeQuoted = !this.quoted
        this.quoted = true
        if(this.predecessorColoured) {
            node.node().accept(this)
            let rend = this.rendered
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                {node.isBack ? '`' : '\''}
                {rend}
            </span>
        }
        else {
            if(node.colour !== ColourType.None)
                this.predecessorColoured = true
            node.node().accept(this)
            let rend = this.rendered
            if(node.colour !== ColourType.None)
                this.predecessorColoured = false
            this.rendered = <span>
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {node.isBack ? '`' : '\''}
                </span>
                {rend}
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>

                </span>
            </span>
        }
        if(changeQuoted)
            this.quoted = false
    }


    onCommaNode(node: QuoteNode){
        if(this.predecessorColoured) {
            node.node().accept(this)
            let rend = this.rendered
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                ,{rend}
            </span>
        }
        else {
            if(node.colour !== ColourType.None)
                this.predecessorColoured = true
            node.node().accept(this)
            let rend = this.rendered
            if(node.colour !== ColourType.None)
                this.predecessorColoured = false
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
            default:
                return "normalInstruction"
        }
    }

}