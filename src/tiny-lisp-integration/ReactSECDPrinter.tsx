
import { SECDVisitor, SECDArray, SECDValue, ColourType } from "@lambdulus/tiny-lisp-core/main"
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
        this.rendered = <ul id="horizontal-list">
            {this.getElements(arr)}
        </ul>
    }

    private getElements(val: SECDValue | SECDArray): JSX.Element{
        if(val instanceof SECDArray) {
            val = val as SECDArray
            let array : JSX.Element[] = []
            array = val.arr.map<JSX.Element>(val => <li> {this.getElements(val)} </li>);
            let name: string = this.getClassName(val)
            return <span className={name}>
                            {'['}
                            {array}
                            {']'}
                        </span>

        }
        else {
            val = val as SECDValue
            let name: string = this.getClassName(val)
            return <span className={name}>
                    {' '}
                    {val.val}
                    {' '}
                </span>

        }
    }

    private getClassName(val: SECDValue | SECDArray): string{
        switch (val.colour){
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