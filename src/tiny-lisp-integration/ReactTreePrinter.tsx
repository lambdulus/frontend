import {
    BinaryExprNode,
    ColourType,
    CompositeNode,
    EndNode,
    FuncNode,
    IfNode,
    InstructionShortcut,
    LambdaNode,
    LispASTVisitor,
    PrintCall, SECDValue,
    TopNode,
    UnaryExprNode,
    ValueNode,
    VarNode,
    InnerNode
} from "@lambdulus/tiny-lisp-core/main";
import React from "react";


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
                <span className="currentInstruction">
                    {InstructionShortcut[node.operator]}
                </span>
                {' '}
                <span className="importantInstruction">
                    {rend1}
                </span>
                {' '}
                <span className="importantInstruction">
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
            this.rendered = <span className="importantInstruction">
                <span className="currentInstruction">
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
                <span className="currentInstruction">
                    {'if'}
                </span>
                    {' '}
                <span className="importantInstruction">
                    {rend1}
                </span>
                    {' '}
                <span className="importantInstruction">
                    {rend2}
                </span>
                    {' '}
                <span className="importantInstruction">
                    {rend3}
                </span>
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
                <span className="importantInstruction">
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
                <span className="currentInstruction">
                    {InstructionShortcut[node.shortcut]}
                </span>
                {' '}
                <span className="importantInstruction">
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
        this.rendered = <span className={this.getClassName(node)}>
            {node.value}
        </span>
    }

    onVarNode(node: VarNode): void {
        this.rendered = <span className={this.getClassName(node)}>
            {node.variable}
        </span>
    }

    private getClassName(node: InnerNode): string{
        switch (node.colour){
            case ColourType.Current:
                return "currentInstruction"
            case ColourType.Coloured:
                return "importantInstruction"
            case ColourType.None:
            default:
                return "normalInstruction"
        }
    }

}