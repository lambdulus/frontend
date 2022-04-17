import {ColourType, IfNode, Instruction, InstructionShortcut, Interpreter,
    InterpreterState, SECDArray, SECDElement, SECDValue } from "@lambdulus/tiny-lisp-core"
import {BinaryExprNode, CompositeNode, FuncNode, InnerNode, QuoteNode, ReduceNode, UnaryExprNode } from "@lambdulus/tiny-lisp-core/dist/AST/AST"


export class Painter {
    
    constructor(private readonly state: InterpreterState) {
    
    }

    private clean(){
        this.state.topNode.clean();
        this.state.code.clearPrinted()
        this.state.code.clean();
        this.state.stack.clearPrinted()
        this.state.stack.clean();
        this.state.dump.clearPrinted()
        this.state.dump.clean();
        this.state.environment.clearPrinted()
        this.state.environment.clean();
    }
    
    colourArray(instruction: Instruction) {
        this.clean()
        let instructionShortcut = instruction.shortcut
        let element: SECDElement
        this.state.code.get(0).colour = ColourType.Current
        let node: InnerNode
        //@ts-ignore
        switch (instructionShortcut) {
            case InstructionShortcut.LDC:
                element = this.state.code.get(1);
                element.getNode().setColour(ColourType.Coloured)
                element.colour = ColourType.Coloured
                break
            case InstructionShortcut.LD:
                this.state.code.get(1).getNode().setColour(ColourType.Current)
                element = this.state.code.get(1);
                let loaded: SECDElement
                if (element instanceof SECDArray) {
                    element.colour = ColourType.Current
                    let index1 = element.get(0)
                    let index2 = element.get(1)
                    if (!(index1 instanceof SECDValue && index2 instanceof SECDValue))
                        throw Error()
                    let val1 = (element.get(0) as SECDValue).constant
                    let val2 = (element.get(1) as SECDValue).constant
                    if ((typeof (val1) != "number") && (typeof (val2) != "number"))
                        throw Error()
                    loaded = Interpreter.evaluateLoad(this.state.environment, val1 as unknown as number, val2 as unknown as number)

                    if (loaded.getNode().parent instanceof QuoteNode) {//If it is quoted list colour it all
                        loaded.getNode().parent.colour = ColourType.Coloured
                        loaded.getNode().parent.setColour(ColourType.Coloured)
                    } else {
                        loaded.colour = ColourType.Coloured;
                        loaded.getNode().setColour(ColourType.Coloured)
                    }
                } else
                    throw Error()
                break
            case InstructionShortcut.SEL:
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                let ifNode = this.state.code.get(0).getNode() as IfNode
                ifNode.setColour(ColourType.Current)
                ifNode.condition().setColour(ColourType.Coloured)
                ifNode.left().setColour(ColourType.SecondColoured)
                ifNode.right().setColour(ColourType.ThirdColoured)
                this.state.code.get(1).colour = ColourType.SecondColoured
                this.state.code.get(2).colour = ColourType.ThirdColoured
                break
            case InstructionShortcut.JOIN:
                this.state.dump.get(this.state.dump.length() - 1).colour = ColourType.Coloured;
                this.state.code.get(0).getNode().setColour(ColourType.Coloured)
                break
            case InstructionShortcut.NIL:
                break
            case InstructionShortcut.DUM:
                break
            case InstructionShortcut.POP:
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                break
            case InstructionShortcut.CONSP:
            case InstructionShortcut.CAR:
            case InstructionShortcut.CDR:
                (<UnaryExprNode> this.state.code.get(0).getNode().parent).expr().setColour(ColourType.Current)
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured;
                break
            case InstructionShortcut.ADD:
            case InstructionShortcut.SUB:
            case InstructionShortcut.MUL:
            case InstructionShortcut.DIV:
            case InstructionShortcut.EQ:
            case InstructionShortcut.NE:
            case InstructionShortcut.LT:
            case InstructionShortcut.LE:
            case InstructionShortcut.HT:
            case InstructionShortcut.HE:
                this.state.code.get(0).getNode().setColour(ColourType.Current);
                (<BinaryExprNode> this.state.code.get(0).getNode().parent).left().setColour(ColourType.Coloured);
                (<BinaryExprNode> this.state.code.get(0).getNode().parent).right().setColour(ColourType.SecondColoured);
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                this.state.stack.get(this.state.stack.length() - 2).colour = ColourType.SecondColoured
                break
            case InstructionShortcut.CONS:/*
                let secondOnstack = this.stack.get(this.stack.length() - 2)
                if(secondOnstack instanceof SECDArray)
                    if(secondOnstack.length() == 0)
                        secondOnstack.node = this.code.get(0).node//If cons called on empty array without node it should be coloured*/
                this.state.code.get(0).getNode().setColour(ColourType.Coloured)
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                this.state.stack.get(this.state.stack.length() - 2).colour = ColourType.SecondColoured;
                break
            case InstructionShortcut.LDF:
                this.state.code.get(1).colour = ColourType.Coloured;
                this.state.code.get(1).getNode().setColour(ColourType.Coloured)
                break
            case InstructionShortcut.AP:
                element = this.state.stack.get(this.state.stack.length() - 1)
                element.colour = ColourType.Current
                node = element.getNode()
                node.setColour(ColourType.Current);
                if (node.parent instanceof FuncNode) {
                    //Normal non recursive lambdas
                    //Here argument will be highlited even if it is variable in code
                    let args = (node.parent as FuncNode).args()
                    if (args instanceof ReduceNode)
                        (args.reduced() as CompositeNode).items().forEach(node => node.setColour(ColourType.Coloured))
                    else
                        (args as CompositeNode).items().forEach(node => node.setColour(ColourType.Coloured))
                } else {
                    //For lambdas defined without argument immediatly following them
                    //If argument is list colour it whole
                    if (this.state.stack.get(this.state.stack.length() - 2).node instanceof QuoteNode)
                        this.state.stack.get(this.state.stack.length() - 2).node.setColour(ColourType.Coloured)
                    //Because of recursive functions where argument is in code just once
                    else
                        (<SECDArray> this.state.stack.get(this.state.stack.length() - 2)).forEach(element => element.getNode().setColour(ColourType.Coloured));
                }
                (<SECDArray> this.state.stack.get(this.state.stack.length() - 2)).forEach(element => element.colour = ColourType.Coloured);
                break
            case InstructionShortcut.RAP:
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Current
                this.state.stack.get(this.state.stack.length() - 1).getNode().colour = ColourType.Current
                this.state.stack.get(this.state.stack.length() - 2).colour = ColourType.Coloured
                this.state.stack.get(this.state.stack.length() - 2).getNode().colour = ColourType.Coloured
                break
            case InstructionShortcut.RTN:
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Current;
                this.state.code.get(this.state.code.length() - 1).getNode().setColour(ColourType.Current)
                this.state.dump.get(this.state.dump.length() - 2).colour = ColourType.ThirdColoured
                this.state.dump.get(this.state.dump.length() - 3).colour = ColourType.SecondColoured
                this.state.dump.get(this.state.dump.length() - 4).colour = ColourType.Coloured
                break
            case InstructionShortcut.DEFUN:
                this.state.code.get(0).getNode().setColour(ColourType.Current)
                this.state.stack.get(0).colour = ColourType.Current
                break
            case InstructionShortcut.STOP:
                break
            default:
                throw Error()
        }
    }
}