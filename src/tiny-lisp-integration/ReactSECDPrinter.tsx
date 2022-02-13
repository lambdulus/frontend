import {
    BinaryExprNode,
    ColourType,
    FuncNode,
    InnerNode,
    Instruction,
    MainNode,
    SECDArray,
    SECDElement,
    SECDValue,
    TopNode
} from "@lambdulus/tiny-lisp-core/main"
import React from "react";

import './styles/Step.css'

export default class ReactSECDPrinter {
    private rendered : JSX.Element | null = null
    private colouredArray: boolean = false

    constructor(arr: SECDArray, public hasMouseOver: () => boolean, public parentHasMouseOver: (innerNode: InnerNode) => boolean) {
        console.log(arr)
        //super();
        this.visit(arr)
    }


    public print(): JSX.Element | null{
        return this.rendered
    }

    visit(arr: SECDArray): void {
        this.rendered = /*<ul id="horizontal-list">
            {*/this.getElements(arr)/*}
        </ul>*/
    }

    private getElements(element: SECDElement): JSX.Element{
        if(element instanceof SECDArray) {
            let array : JSX.Element[] = []
            console.log("array", element.arr)
            if(element.colour !== ColourType.None)
                this.colouredArray = true
            array = element.arr.map<JSX.Element>(value => this.getElements(value));
            if(element.colour !== ColourType.None)
                this.colouredArray = false
            let name: string = this.getClassName(element)
            console.log("ABCDEFGH", array, element.node, element.arr)
            return <span className={name}>
                            {'['}
                            {array}
                            {']'}
                        </span>

        }
        else if(element instanceof SECDValue){
            let name: string = this.getClassName(element)
            console.log("element: ", name, element.val)
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
        let node = val.getNode()
        if(typeof(node) != "undefined"){
            console.log(val, "Noda je defined.", node)
            if(node instanceof TopNode)
                node = node.node
            if(node instanceof MainNode)
                node = node.node
            if(node instanceof BinaryExprNode){
                console.log("OPERATOR V GETCLASSNAME")
                if(this.parentHasMouseOver(node.operator)){
                    return this.highlight(val.colour)
                }
            }
            else if(node instanceof FuncNode){
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
}