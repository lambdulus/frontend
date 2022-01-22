import {
    BinaryExprNode,
    ColourType,
    CompositeNode,
    EndNode,
    FuncNode,
    IfNode,
    InnerNode,
    InstructionShortcut,
    LambdaNode,
    LispASTVisitor,
    PrintCall,
    StringNode,
    TopNode,
    UnaryExprNode,
    ValueNode,
    VarNode
} from "@lambdulus/tiny-lisp-core/main";
import React from "react";
import {ListNode} from "@lambdulus/tiny-lisp-core/src/AST/AST";


export default class ReactTreePrinter extends LispASTVisitor{
    private rendered : JSX.Element | null = null

    constructor(public readonly node: TopNode, public readonly printCall: PrintCall) {
        super()
        node.accept(this)
    }

    public print(): JSX.Element | null{
        return this.rendered
    }

    onBinaryExprNode(node: BinaryExprNode): void {
        node.left.accept(this)
        let rend1 = this.rendered
        node.right.accept(this)
        let rend2 = this.rendered
        if(node.colour === ColourType.Current){
            this.rendered = <span className="#">
                {'('}
                <span className="underlineCurrent">
                    {InstructionShortcut[node.operator]}
                </span>
                {' '}
                <span className="underlineFirstArgument">
                    {rend1}
                </span>
                {' '}
                <span className="underlineSecondArgument">
                    {rend2}
                </span>
                {')'}
            </span>
        }
        else {
            this.rendered = <span className="#">
            {'('}
            {InstructionShortcut[node.operator]}
            {' '}
            {rend1}
            {' '}
            {rend2}
            {')'}
        </span>
        }
    }

    onCompositeNode(node: CompositeNode): void {
        let acc: Array<JSX.Element> = []
        node.items.reverse().forEach(item => {
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
        if(this.printCall === PrintCall.Static)
            node.next.accept(this)
        else if(this.printCall === PrintCall.Dynamic){
            node.reduced.accept(this)
        }
    }

    onFuncNode(node: FuncNode): void {
        node.func.accept(this)
        let rend1 = this.rendered
        node.args.accept(this)
        let rend2 = this.rendered
        if (node.colour === ColourType.Current) {
            this.rendered = <span className="underlineFirstArgument">
                <span className="underlineCurrent">
                    {rend1}
                </span>
                {rend2}
        </span>
        }
        else {
            this.rendered = <span className="#">
                {rend1}
                {rend2}
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
                {'('}
                <span className="underlineCurrent">
                    {'if'}
                </span>
                    {' '}
                <span className="underlineFirstArgument">
                    {rend1}
                </span>
                    {' '}
                <span className="underlineSecondArgument">
                    {rend2}
                </span>
                    {' '}
                <span className="underlineThirdArgument">
                    {rend3}
                </span>
                {')'}
            </span>
        }
        else if (node.colour === ColourType.Coloured) {
            this.rendered = <span className="underlineCurrent">
                {'(if '}
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
                {'(if '}
                {rend1}
                {' '}
                {rend2}
                {' '}
                {rend3}
                {')'}
            </span>
        }
    }

    onLambdaNode(node: LambdaNode): void {
        node.vars.accept(this)
        let rend1 = this.rendered
        node.body.accept(this)
        let rend2 = this.rendered
        if (node.colour === ColourType.Current) {
            this.rendered =
                <span className="underlineCurrent">
                    {'((lambda ('}
                    {rend1}
                    {')'}
                    {rend2}
                    {'))'}
                </span>
        }
        else if (node.colour === ColourType.Coloured) {
            this.rendered =
                <span className="underlineFirstArgument">
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
        node.node.accept(this)
    }

    onUnaryExprNode(node: UnaryExprNode): void {
        node.expr.accept(this)
        let rend1 = this.rendered
        if(node.colour === ColourType.Current){
            this.rendered = <span className="#">
                {'('}
                <span className="underlineCurrent">
                    {InstructionShortcut[node.shortcut]}
                </span>
                {' '}
                <span className="underlineFirstArgument">
                    {rend1}
                </span>
                {')'}
            </span>
        }
        else {
            this.rendered = <span className="#">
            {'('}
                {InstructionShortcut[node.shortcut]}
                {' '}
                {rend1}
                {')'}
        </span>
        }
    }

    onValueNode(node: ValueNode): void {
        this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
            {node.value}
        </span>
    }

    onVarNode(node: VarNode): void {
        this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
            {node.variable}
        </span>
    }

    onListNode(node: ListNode): void {
        let res = "'" + node.print(PrintCall.Static)
        this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
            {res}
        </span>
    }

    onStringNode(node: StringNode) {
        this.rendered = <span className={ReactTreePrinter.getClassName(node)}>
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
            default:
                return "normalInstruction"
        }
    }

}