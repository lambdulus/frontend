import {
    BinaryExprNode,
    CallNode,
    ColourType,
    CompositeNode,
    DefineNode,
    EndNode,
    FuncNode,
    IfNode,
    InnerNode,
    InstructionShortcut,
    LambdaNode,
    LetNode,
    LispASTVisitor,
    MainNode,
    OperatorNode,
    StringNode,
    TopNode,
    UnaryExprNode,
    ValueNode,
    VarNode
} from "@lambdulus/tiny-lisp-core/src/index";
import React, {MouseEvent} from "react";
import {ListNode} from "@lambdulus/tiny-lisp-core/src/AST/AST";


export default class ReactTreePrinter extends LispASTVisitor{
    private rendered : JSX.Element | null = null
    private parentColoured: boolean = false
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
            /*node.operator.accept(this)
            let rend1 = this.rendered*/
            node.left.accept(this)
            let rend2 = this.rendered
            node.right.accept(this)
            let rend3 = this.rendered
            console.log("BIN 0")
            this.rendered = <span className="#">
                {'('}
                {InstructionShortcut[node.operator.operator]}
                {' '}
                {rend2}
                {' '}
                {rend3}
                {')'}
            </span>
        }
        else {
            if(node.colour === ColourType.Current)
                this.parentColoured = true
            /*node.operator.accept(this)
            let rend1 = this.rendered*/
            node.left.accept(this)
            let rend2 = this.rendered
            node.right.accept(this)
            let rend3 = this.rendered
            if (node.colour === ColourType.Current) {
                console.log("BIN 1")
                this.rendered = <span className="#">
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'('}
                    </span>
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {InstructionShortcut[node.operator.operator]}
                    </span>
                        {' '}
                        <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.left)}
                              onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend2}
                    </span>
                        {' '}
                        <span className="underlineSecondArgument" onMouseOver={e => this.handleMouseOver(e, node.right)}
                              onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend3}
                    </span>
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {')'}
                    </span>
                </span>
                this.parentColoured = false
            }
            else {
                console.log("BIN 2")
                this.rendered = <span className="#">
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('}
                </span>
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {InstructionShortcut[node.operator.operator]}
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
        node.items.forEach(item => {
            item.accept(this)
            if (this.rendered) {
                acc.push(this.rendered)
                acc.push(<span>
                    {' '}
                </span>)
            }
        })
        acc.slice(0, -1)
        this.rendered = <span>
            {acc}
        </span>
    }

    onEndNode(node: EndNode): void {
        node.next.accept(this)
    }

    onFuncNode(node: FuncNode): void {
        if(this.parentColoured){
            node.func.accept(this)
            let rend1 = this.rendered
            node.args.accept(this)
            let rend2 = this.rendered
            this.rendered = <span className="#">
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'('}
                </span>
                {rend1}
                {' '}
                {rend2}
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {')'}
                </span>
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true
            node.func.accept(this)
            let rend1 = this.rendered
            node.args.accept(this)
            let rend2 = this.rendered
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
            if(node.colour === ColourType.Current)
                this.parentColoured = false
        }
        this.removeTab()
        this.removeTab()
    }

    onIfNode(node: IfNode): void {//TODO deep copy of tabs
        this.addTab()
        let tab1 = this.tabs.map(tab => Object.assign({}, tab))
        this.addTab()
        let tab2 = this.tabs.map(tab => Object.assign({}, tab))
        if(this.parentColoured){
            node.condition.accept(this)
            let rend1 = this.rendered
            node.left.accept(this)
            let rend2 = this.rendered
            node.right.accept(this)
            let rend3 = this.rendered
            this.rendered = <span className="#">
                <br></br>
                {tab1}
                (if
                ({rend1})
                <br></br>
                {tab2}
                {rend2}
                <br></br>
                {tab2}
                {rend3}
                )
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true
            node.condition.accept(this)
            let rend1 = this.rendered
            node.left.accept(this)
            let rend2 = this.rendered
            node.right.accept(this)
            let rend3 = this.rendered
            if (node.colour === ColourType.Current) {
                this.rendered = <span className="#">
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        <br></br>
                        {tab1}
                        (if
                    </span>
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.condition)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {" ("}
                        {rend1}
                        {')'}
                    </span>
                    <br></br>
                    {tab2}
                    <span className="underlineSecondArgument" onMouseOver={e => this.handleMouseOver(e, node.left)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend2}
                    </span>
                    <br></br>
                    {tab2}
                    <span className="underlineThirdArgument" onMouseOver={e => this.handleMouseOver(e, node.right)}
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
                        <br></br>
                        {tab1}
                        (if
                        ({rend1})
                        <br></br>
                        {tab2}
                        {rend2}
                        <br></br>
                        {tab2}
                        {rend3}
                            )
                    </span>
                </span>
            }
            else {
                this.rendered = <span className="#">
                    <br></br>
                    {tab1}
                    <span onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        (if
                    </span>
                    ({rend1})
                    <br></br>
                    {tab2}
                    {rend2}
                    <br></br>
                    {tab2}
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
        this.removeTab()
    }

    onLambdaNode(node: LambdaNode): void {
        console.log("Lambda Node: ", node)
        this.addTab()
        let tab1 = this.tabs.map(tab => Object.assign({}, tab))
        this.addTab()
        let tab2 = this.tabs.map(tab => Object.assign({}, tab))
        if(this.parentColoured){
            node.vars.accept(this)
            let rend1 = this.rendered
            node.body.accept(this)
            let rend2 = this.rendered
            this.rendered =
                <span>
                    <br></br>
                    {tab1}
                    {'((lambda ('}
                    {rend1}
                    {')'}
                    {tab2}
                    {rend2}
                    {'))'}
                </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true

            node.vars.accept(this)
            let rend1 = this.rendered
            node.body.accept(this)
            let rend2 = this.rendered
            if (node.colour === ColourType.Current) {
                this.rendered =
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        <br></br>
                        {tab1}
                        {'((lambda ('}
                        {rend1}
                        {')'}
                        {tab2}
                        {rend2}
                        {'))'}
                </span>
            } else if (node.colour === ColourType.Coloured) {
                this.rendered =
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        <br></br>
                        {tab1}
                        {'((lambda ('}
                        {rend1}
                        {')'}
                        {tab2}
                        {rend2}
                        {'))'}
                </span>
            }
            else {
                this.rendered = <span className="#">
                    <br></br>
                    {tab1}
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'((lambda ('}
                    </span>
                    {rend1}
                    {')'}
                    {tab2}
                    {rend2}
                    <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'))'}
                </span>
            </span>
            }
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = false
        }
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
        node.vars.accept(this)
        let rend1 = this.rendered
        node.body.accept(this)
        let rend2 = this.rendered
        let name = node.name
        if(node.colour === ColourType.Current){
            this.rendered = <span className="#">
                <span onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'(define '}
                    {node.name}
                </span>
                {'('}
                <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node.vars)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend1}
                </span>
                {')'}
                {
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.body)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend2}
                        {')'}
                    </span>
                }
            </span>
        }
        else {
            this.rendered = <div>
                        <span className="#">
                            <span onMouseOver={e => this.handleMouseOver(e, node)}
                                  onMouseLeave={e => this.handleMouseLeft(e)}>
                                (define {name}
                            </span>
                            ({rend1})
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
        if(this.parentColoured){
            node.names.accept(this)
            let rend1 = this.rendered
            node.second.accept(this)
            let rend2 = this.rendered
            node.body.accept(this)
            let rend3 = this.rendered
            this.rendered = <span className="#">
                {'(let('}
                {rend1}
                {')'}
                {'('}
                {rend2}
                {')'}
                <br></br>
                {rend3}
                {')'}
            </span>
        }
        else {
            if(node.colour === ColourType.Current)
                this.parentColoured = true
            node.names.accept(this)
            let rend1 = this.rendered
            node.second.accept(this)
            let rend2 = this.rendered
            node.body.accept(this)
            let rend3 = this.rendered
            if (node.colour === ColourType.Current) {
                this.rendered = <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                <span className="#">
                        {'(let('}
                    {rend1}
                    {')'}
                    </span>
                    {'('}
                    {rend2}
                    {'))'}
                    <br></br>
                    {rend3}
                    <span className="#">
                        {')'}
                    </span>
                </span>
            }
            else {
                this.rendered = <span className="#">
                <span className="#" onMouseOver={e => this.handleMouseOver(e, node)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {'(let('}
                        {rend1}
                        {')'}
                    </span>
                        {'('}
                        {rend2}
                        {'))'}
                        <br></br>
                        {rend3}
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
            node.body.accept(this)
            let rend1 = this.rendered
            this.rendered = <span className="#">
                {rend1}
            </span>
        }
        else {
            if(node.colour === ColourType.Current || node.colour === ColourType.Coloured)
                this.parentColoured = true

            node.body.accept(this)
            let rend1 = this.rendered
            if(node.colour === ColourType.Current){
                this.rendered = <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend1}
                </span>
            }
            if(node.colour === ColourType.Coloured){
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
        if(this.parentColoured){
            node.operator.accept(this)
            let rend1 = this.rendered
            node.expr.accept(this)
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
            if(node.colour === ColourType.Current)
                this.parentColoured = true
            node.operator.accept(this)
            let rend1 = this.rendered
            node.expr.accept(this)
            let rend2 = this.rendered
            if (node.colour === ColourType.Current) {
                this.rendered = <span className="#">
                    {'('}
                    <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node.operator)} onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend1}
                    </span>
                        {' '}
                    <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.expr)}
                          onMouseLeave={e => this.handleMouseLeft(e)}>
                        {rend2}
                    </span>
                    {')'}
                </span>
            }
            else {
                this.rendered = <span className="#">
                    {'('}
                        {rend1}
                        {' '}
                        {rend2}
                        {')'}
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
        this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
            {InstructionShortcut[node.operator]}
        </span>
    }

    onListNode(node: ListNode): void {
        node.items.accept(this)
        let rend = this.rendered
        if(this.rendered) {
            this.rendered =
                <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)}
                      onMouseLeave={e => this.handleMouseLeft(e)}>
                '(
                {rend}
                )
            </span>
        }
        else
            this.rendered =
                <span className={ReactTreePrinter.getClassName(node)}>
                '(
                {rend}
                )
            </span>
    }

    onStringNode(node: StringNode) {
        if(this.parentColoured)
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                "
                {node.str}
                "
            </span>
        else
            this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
                "
                {node.str}
                "
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