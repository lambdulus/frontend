import ReactSECDPrinter from "./ReactSECDPrinter";
import {ColourType, InnerNode, SECDArray, SECDElement} from "@lambdulus/tiny-lisp-core/src/index"


export default class DumpPrinter extends ReactSECDPrinter {


    constructor(arr: SECDArray, public hasMouseOver: () => boolean, public parentHasMouseOver: (innerNode: InnerNode) => boolean) {
        super(arr, hasMouseOver, parentHasMouseOver)
    }

    protected getClassName(val: SECDElement): string {
        if(val.colour !== ColourType.None)
            return this.hasMouseOver() ? this.highlight(val.colour) : super.getClassName(val)
        return super.getClassName(val)
    }
}