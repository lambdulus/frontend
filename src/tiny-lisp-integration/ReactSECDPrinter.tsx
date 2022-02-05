import {
    ColourType,
    SECDArray,
    SECDValue,
    SECDElement,
    Instruction,
    BinaryExprNode
} from "@lambdulus/tiny-lisp-core/main"
import React from "react";

import './styles/Step.css'

export default class ReactSECDPrinter {
    private rendered : JSX.Element | null = null

    constructor(arr: SECDArray) {
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
            array = element.arr.map<JSX.Element>(value => this.getElements(value));
            let name: string = ReactSECDPrinter.getClassName(element)
            console.log("ABCDEFGH", array, element.node, element.arr)
            return <span className={name}>
                            {'['}
                            {array}
                            {']'}
                        </span>

        }
        else if(element instanceof SECDValue){
            let name: string = ReactSECDPrinter.getClassName(element)
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

    private static getClassName(val: SECDElement): string{
        let node = val.getNode()
        if(typeof(node) != "undefined"){
            console.log(val, "Noda je defined.", node)
            if(node instanceof BinaryExprNode){
                if(node.operator.mouseOver){
                    switch (val.colour){
                        case ColourType.Current:
                            return "highlightCurrent"
                        case ColourType.Coloured:
                            return "highlightFirstArgument"
                        case ColourType.SecondColoured:
                            return "highlightSecondArgument"
                        case ColourType.ThirdColoured:
                            return "highlightThirdArgument"
                        case ColourType.None:
                        default:
                            return "normalInstruction"
                    }
                }
            }
            if(node.mouseOver){
                console.log("Noda ma na sobe mys.")
                switch (val.colour){
                    case ColourType.Current:
                        return "highlightCurrent"
                    case ColourType.Coloured:
                        return "highlightFirstArgument"
                    case ColourType.SecondColoured:
                        return "highlightSecondArgument"
                    case ColourType.ThirdColoured:
                        return "highlightThirdArgument"
                    case ColourType.None:
                    default:
                        return "normalInstruction"
                }
            }
        }
        console.log(val, "No highlight")
        switch (val.colour){
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