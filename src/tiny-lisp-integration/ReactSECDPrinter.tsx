import {
    ColourType,
    ApplicationNode,
    InnerNode,
    Instruction,
    InstructionShortcut,
    SECDArray,
    SECDElement,
    SECDValue,
    PrintedState,
    GeneralUtils,
    ReduceNode,
    SECDHidden
} from "@lambdulus/tiny-lisp-core"
import React from "react";

import './styles/Step.css'


export default class ReactSECDPrinter {
    private rendered : JSX.Element | null = null
    private enclosingArrayColoured: boolean = false
    private placeholders: Array<string> = []

    constructor(arr: SECDArray, public hasMouseOver: () => boolean, public parentHasMouseOver: (innerNode: InnerNode, returnTrueIfColoured: boolean) => boolean,
               readonly current: InstructionShortcut) {
        this.visit(arr)
        this.placeholders = []
    }


    public print(): JSX.Element | null{
        return this.rendered
    }

    visit(arr: SECDArray): void {
        this.rendered = this.getElements(arr)
    }

    /**
     * Generate React Component for SECDElement
     * @param element
     * @private
     */

    private getElements(element: SECDElement): JSX.Element{
        if(element instanceof SECDArray) {
            if(element.empty()) {//If empty than no need for recursion
                return <span className={this.getClassName(element)}> [] </span>
            }
            if(element.printedState !== PrintedState.Not) {//If already printed and placeholder string can be used, use the placeholder
                if (typeof (element.node) != "undefined") {
                    console.log("01245648684", element)
                    let str = GeneralUtils.getFunctionName(element.node)
                    if (str !== "") {
                        this.placeholders.push(str)
                        element.printedInc()
                        let colour: ColourType = this.enclosingArrayColoured ? ColourType.None : element.colour//If node is coloured, colour also placeholder
                        let name = this.parentHasMouseOver(element.node, colour !== ColourType.None)
                            && !this.enclosingArrayColoured ? this.highlight(colour) : this.underline(colour)
                        return <span className={name}>
                            [{str}]
                        </span>
                    }
                }
            }
            element.printedInc()//Array is printed so update its printed state
            let array : JSX.Element[] = []
            if(element.colour !== ColourType.None)//If this array is coloured, don't colour inner elements
                this.enclosingArrayColoured = true
            array = element.arr.map<JSX.Element>(value => this.getElements(value)).reverse();//call getElements on values and reverse so top of registers will be on left
            if(element.colour !== ColourType.None)
                this.enclosingArrayColoured = false
            let name: string = this.getClassName(element)// get class name
            // @ts-ignore
            if(element.printedState === PrintedState.More && element.node){//If array is inside itself, declare a placeholder
                let str = GeneralUtils.getFunctionName(element.node)
                console.log("jhkjbhll", element)
                if(str !== "") {
                    return <span className={name}>
                                {str}
                        {': ['}
                        {array}
                        {']'}
                            </span>
                }
            }
            return <span className={name}>
                            {'['}
                {array}
                {']'}
                        </span>

        }
        else if(element instanceof SECDValue){
            let name: string = this.getClassName(element)
            if(element.constant instanceof Instruction){
                return <span className={name}>
                    {' '}
                    {element.constant.toString()}
                    {' '}
                </span>
            }
            return <span className={name}>
                    {' '}
                {element.constant}
                {' '}
                </span>

        }
        else if(element instanceof SECDHidden){
            return <span/>
        }
        throw Error()
    }

    /**
     * Returns className picked based on elements colour. 
     * If elements node or its predecesor is coloured className start as highlighte, othrewise it starts as underline.
     * @param val
     * @protected
     */

    protected getClassName(val: SECDElement): string{
        if(this.enclosingArrayColoured)
            return this.underline(val.colour)
        let node = val.node//important
        if(typeof(node) != "undefined"){
            let coloured = val.colour !== ColourType.None
            if(node instanceof ApplicationNode && val.colour === ColourType.Current){//AP instruction is specificaly coloured
                node = node.func()
                if(node instanceof ReduceNode){
                    node = node.reduced()//If func is recursive function then next is its name in code and reduced its lambda
                }
            }
            if(this.parentHasMouseOver(node, coloured)){
                return this.highlight(val.colour)
            }
        }
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
            default:
                return "highlightOther"
        }
    }
}