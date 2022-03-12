import ReactSECDPrinter from "./ReactSECDPrinter";
import {ColourType, InnerNode, InstructionShortcut, SECDArray, SECDElement} from "@lambdulus/tiny-lisp-core"


export default class DumpPrinter extends ReactSECDPrinter {


    constructor(arr: SECDArray, public hasMouseOver: () => boolean, public parentHasMouseOver: (innerNode: InnerNode, returnTrueIfColoured: boolean) => boolean,
                current: InstructionShortcut) {
        super(arr, hasMouseOver, parentHasMouseOver, current)
    }

    protected getClassName(val: SECDElement): string {
        if(val.colour !== ColourType.None)
            return this.hasMouseOver() ? this.highlight(val.colour) : super.getClassName(val)
        return super.getClassName(val)
    }
}