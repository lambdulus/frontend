import {
    ColourType,
    FuncNode,
    InnerNode,
    Instruction,
    InstructionShortcut,
    SECDArray,
    SECDElement,
    SECDValue,
    PrintedState,
    GeneralUtils,
    ReduceNode,
    SECDInvalid,
    SECDMacro
} from "@lambdulus/tiny-lisp-core"
import React from "react";

import './styles/Step.css'


export default class ReactSECDPrinter {
    private rendered : JSX.Element | null = null
    private enclosingArrayColoured: boolean = false
    private placeholders: Array<string> = []

    constructor(arr: SECDArray, public hasMouseOver: () => boolean, public parentHasMouseOver: (innerNode: InnerNode, returnTrueIfColoured: boolean) => boolean,
               readonly current: InstructionShortcut) {
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

    /**
     * Generate React Component for SECDElement
     * @param element
     * @private
     */

    private getElements(element: SECDElement): JSX.Element{
        if(element instanceof SECDArray) {
            if(element.empty()) {//If empty than no need for recursion
                console.log("getElements: Empty arr", element)
                return <span className={this.getClassName(element)}> [] </span>
            }
            if(element.printedState !== PrintedState.Not) {//If already printed and placeholder string can be used, use the placeholder
                if (typeof (element.getNode()) != "undefined") {
                    console.log("(Func) Placeholder for: ", element, element.node, element.printedState)
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
                console.log("Invalid placeholder", element, element.node, element.printedState)

            }
            element.printedInc()//Array is printed so update its printed state
            let array : JSX.Element[] = []
            console.log("array", element.arr)
            if(element.colour !== ColourType.None)//If this array is coloured, don't colour inner elements
                this.enclosingArrayColoured = true
            array = element.arr.map<JSX.Element>(value => this.getElements(value));
            if(element.colour !== ColourType.None)
                this.enclosingArrayColoured = false
            let name: string = this.getClassName(element)// get class name
            console.log("ABCDEFGH", array, element.node, element.arr, element.printedState)
            // @ts-ignore
            if(element.printedState === PrintedState.More && element.node){//If array is inside itself, declare a placeholder
                let str = GeneralUtils.getFunctionName(element.node)
                if(str !== "") {
                    console.log("Naming function", element, str, name)
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
            console.log("element: ", name, element.val, this.enclosingArrayColoured)
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
        else if(element instanceof SECDInvalid){
            return <span/>
        }
        else if(element instanceof SECDMacro){
            let name: string = this.getClassName(element)
            return <span className={name}>
                '{element.macro}'
            </span>
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
            if(node instanceof FuncNode && val.colour === ColourType.Current){//AP instruction is specificaly coloured
                node = node.func()
                if(node instanceof ReduceNode){
                    node = node.reduced()//If func is recursive function then next is its name in code and reduced its lambda
                }
            }
            if(this.parentHasMouseOver(node, coloured)){
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