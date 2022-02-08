import {
    BinaryExprNode,
    ColourType,
    CompositeNode,
    DefineNode,
    EndNode,
    FuncNode,
    IfNode,
    InnerNode,
    InstructionShortcut,
    LambdaNode,
    LispASTVisitor,
    MainNode,
    OperatorNode,
    StringNode,
    TopNode,
    UnaryExprNode,
    ValueNode,
    VarNode
} from "@lambdulus/tiny-lisp-core/main";
import React, {MouseEvent} from "react";
import {ListNode} from "@lambdulus/tiny-lisp-core/src/AST/AST";


export default class ReactTreePrinter extends LispASTVisitor{
    private rendered : JSX.Element | null = null

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

    onBinaryExprNode(node: BinaryExprNode): void {
        node.operator.accept(this)
        let rend1 = this.rendered
        node.left.accept(this)
        let rend2 = this.rendered
        node.right.accept(this)
        let rend3 = this.rendered
        if(node.colour === ColourType.Current){
            this.rendered = <span className="#">
                {'('}
                <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node.operator)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend1}
                </span>
                {' '}
                <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.left)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend2}
                </span>
                {' '}
                <span className="underlineSecondArgument" onMouseOver={e => this.handleMouseOver(e, node.right)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend3}
                </span>
                {')'}
            </span>
        }
        else {
            console.log("NODE V BINARYOP: ", node)
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
        node.func.accept(this)
        let rend1 = this.rendered
        node.args.accept(this)
        let rend2 = this.rendered
        if (node.colour === ColourType.Current) {
            this.rendered = <span className="underlineFirstArgument">
                {'('}
                <span className="underlineCurrent">
                    {rend1}
                </span>
                {' '}
                {rend2}
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
    }

    onIfNode(node: IfNode): void {
        node.condition.accept(this)
        let rend1 = this.rendered
        node.left.accept(this)
        let rend2 = this.rendered
        node.right.accept(this)
        let rend3 = this.rendered
        if (node.colour === ColourType.Current) {
            this.rendered = <span className="#">
                <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    (if
                </span>
                {' ('}
                <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.condition)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend1}
                </span>
                {')'}
                <br></br>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="underlineSecondArgument" onMouseOver={e => this.handleMouseOver(e, node.left)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend2}
                </span>
                <br></br>
                &nbsp;&nbsp;&nbsp;&nbsp;
                <span className="underlineThirdArgument" onMouseOver={e => this.handleMouseOver(e, node.right)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend3}
                </span>
                )
            </span>
        }
        else if (node.colour === ColourType.Coloured) {
            this.rendered = <span className="underlineCurrent"onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                (if ({rend1})
                    <br></br>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {rend2}
                    <br></br>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                        {rend3}
                    )
            </span>
        }
        else {
            this.rendered = <span className="#">
                (if ({rend1})
                    <br></br>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {rend2}
                    <br></br>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    {rend3}
                    )

            </span>
        }
    }

    onLambdaNode(node: LambdaNode): void {
        console.log("Lambda Node: ", node)
        node.vars.accept(this)
        let rend1 = this.rendered
        node.body.accept(this)
        let rend2 = this.rendered
        if (node.colour === ColourType.Current) {
            this.rendered =
                <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'((lambda ('}
                    {rend1}
                    {')'}
                    {rend2}
                    {'))'}
                </span>
        }
        else if (node.colour === ColourType.Coloured) {
            this.rendered =
                <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {'((lambda ('}
                    {rend1}
                    {')'}
                    {rend2}
                    {'))'}
                </span>
        }
        else {
            this.rendered = <span className="#">
            {'((lambda ('}
                {rend1}
                {')'}
                {rend2}
                {'))'}
        </span>
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
                {'(define '}
                {node.name}
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
                        (define {name}({rend1})
                            <ul id="horizontal-list">
                                {rend2}
                                )
                            </ul>
                </span>
            </div>
        }
    }

    onUnaryExprNode(node: UnaryExprNode): void {
        node.operator.accept(this)
        let rend1 = this.rendered
        node.expr.accept(this)
        let rend2 = this.rendered
        if(node.colour === ColourType.Current){
            this.rendered = <span className="#">
                {'('}
x                <span className="underlineCurrent" onMouseOver={e => this.handleMouseOver(e, node.operator)} onMouseLeave={e => this.handleMouseLeft(e)}>
                    {rend1}
                </span>
                {' '}
                <span className="underlineFirstArgument" onMouseOver={e => this.handleMouseOver(e, node.expr)} onMouseLeave={e => this.handleMouseLeft(e)}>
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
    }

    onValueNode(node: ValueNode): void {
        if(node.colour !== ColourType.None) {
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.value}
            </span>
        }
        else {
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.value}
            </span>
        }

    }

    onVarNode(node: VarNode): void {
        if(node.colour !== ColourType.None){
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.variable}
            </span>
        }
        else {
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {node.variable}
            </span>
        }
    }

    onOperatorNode(node: OperatorNode) {
        if(node.colour !== ColourType.None){
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseOver={e => this.handleMouseOver(e, node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {InstructionShortcut[node.operator]}
            </span>
        }
        else {
            this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseLeave={e => this.handleMouseLeft(e)}>
                {InstructionShortcut[node.operator]}
            </span>
        }
    }

    onListNode(node: ListNode): void {
        let res = "'" + node.print()
        this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseLeave={e => this.handleMouseLeft(e)}>
            {res}
        </span>
    }

    onStringNode(node: StringNode) {
        this.rendered = <span className={ReactTreePrinter.getClassName(node)} onMouseLeave={e => this.handleMouseLeft(e)}>
            {"\"" + node.str + "\""}
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