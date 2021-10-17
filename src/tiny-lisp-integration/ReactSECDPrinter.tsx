import {
    BinaryExprNode,
    ColourType,
    FuncNode,
    InnerNode,
    Instruction,
    LambdaNode,
    LetNode,
    SECDArray,
    SECDElement,
    SECDValue,
    PrintedState
} from "@lambdulus/tiny-lisp-core/dist/index"
import React from "react";

import './styles/Step.css'


export default class ReactSECDPrinter {
    private rendered : JSX.Element | null = null
    private colouredArray: boolean = false
    private placeholders: Array<string> = []

    constructor(arr: SECDArray, public hasMouseOver: () => boolean, public parentHasMouseOver: (innerNode: InnerNode) => boolean) {
        console.log(arr)
        //super();
        this.visit(arr)
        this.placeholders = []
    }


    public print(): JSX.Element | null{
        return this.rendered
    }

    visit(arr: SECDArray): void {
        this.rendered = this.getElements(arr)
    }

    private getElements(element: SECDElement): JSX.Element{
        if(element instanceof SECDArray) {
            if(element.empty()) {
                console.log("getElements: Empty arr", element)
                return <span className={this.getClassName(element)}> [] </span>
            }
            if(element.printed !== PrintedState.NO) {
                if (typeof (element.node) != "undefined") {
                    console.log("(Func) Placeholder for: ", element, element.node, element.printed)
                    let str = this.getFunctionName(element.node)
                    if (str !== "") {
                        this.placeholders.push(str)
                        element.printInc()
                        return <span>
                    [{str}]
                </span>
                    }
                }
            }
            console.log("CHECKPOINT 1", element, element.printed)
            element.printInc()
            console.log("CHECKPOINT 2", element, element.printed)
            let array : JSX.Element[] = []
            console.log("array", element.arr)
            if(element.colour !== ColourType.None)
                this.colouredArray = true
            array = element.arr.map<JSX.Element>(value => this.getElements(value));
            if(element.colour !== ColourType.None)
                this.colouredArray = false
            let name: string = this.getClassName(element)
            console.log("ABCDEFGH", array, element.node, element.arr, element.printed)
            // @ts-ignore
            if(element.printed === PrintedState.More){
                let str = this.getFunctionName(element.node)
                console.log("Naming function", element)
                if(str !== "")
                    return <span className={name}>
                                {str}
                        {': ['}
                        {array}
                        {']'}
                            </span>
            }
            return <span className={name}>
                            {'['}
                {array}
                {']'}
                        </span>

        }
        else if(element instanceof SECDValue){
            let name: string = this.getClassName(element)
            console.log("element: ", name, element.val, this.colouredArray)
            if(element.val instanceof Instruction){
                return <span className={name}>
                    {' '}
                    {element.val.toString()}
                    {' '}
                </span>
            }
            return <span className={name}>
                    {' '}
                {element.val}
                {' '}
                </span>

        }
        throw Error()
    }

    protected getClassName(val: SECDElement): string{
        if(this.colouredArray)
            return this.underline(val.colour)
        if(val.colour === ColourType.Return){
            return this.hasMouseOver() ? "highlightCurrent" : "underlineCurrent"
        }
        let node = val.node//important
        if(typeof(node) != "undefined"){
            console.log(val, "Noda je defined.", node)
            /*if(node instanceof TopNode)
                node = node.node
            if(node instanceof MainNode)
                node = node.node*/
            if(node instanceof BinaryExprNode){
                console.log("OPERATOR V GETCLASSNAME")
                if(this.parentHasMouseOver(node.operator)){
                    return this.highlight(val.colour)
                }
            }
            else if(node instanceof FuncNode && val.colour === ColourType.Current){
                node = node.func
            }
            if(this.parentHasMouseOver(node)){
                console.log("Noda ma na sobe mys.", node, val.colour)
                return this.highlight(val.colour)
            }
        }
        console.log(val, "No highlight")
        return this.underline(val.colour)
    }

    protected underline(colour: ColourType): string{
        switch (colour){
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

    protected highlight(colour: ColourType): string{
        switch (colour){
            case ColourType.Current:
                return "highlightCurrent"
            case ColourType.Coloured:
                return "highlightFirstArgument"
            case ColourType.SecondColoured:
                return "highlightSecondArgument"
            case ColourType.ThirdColoured:
                return "highlightThirdArgument"
            case ColourType.None:
            case ColourType.Return:
            default:
                return "highlightOther"
        }
    }

    protected getFunctionName(node: InnerNode): string{
        if(node instanceof FuncNode) {
            return (node as FuncNode).func.print()
        }
        else if(node instanceof LetNode){
            return ((node as LetNode).body as FuncNode).func.print()
        }
        else if(node instanceof LambdaNode){
            console.log("NEJAKY DEBUG VYPIS", node._parent)
            return ((node._parent as LetNode).body as FuncNode).func.print()
        }
        return ""
    }
}