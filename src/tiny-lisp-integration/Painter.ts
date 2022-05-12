import {ColourType, IfNode, Instruction, InstructionShortcut, InterpreterUtils,
    InterpreterState, SECDArray, SECDElement, SECDValue } from "@lambdulus/tiny-lisp-core"
import {BinaryExprNode, CompositeNode, ApplicationNode, InnerNode, QuoteNode, ReduceNode, UnaryExprNode } from "@lambdulus/tiny-lisp-core/dist/AST/AST"


export class Painter {
    
    constructor(private readonly state: InterpreterState) {
    
    }

    clean(){
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
        if(instruction.shortcut === InstructionShortcut.DUMMY){
            return
        }
        let instructionShortcut = instruction.shortcut
        let element: SECDElement
        this.state.code.get(this.state.code.length() - 1).colour = ColourType.Current
        let node: InnerNode
        //@ts-ignore
        switch (instructionShortcut) {
            case InstructionShortcut.LDC:
                element = this.state.code.get(this.state.code.length() - 2);
                element.node.setColour(ColourType.Coloured)
                element.colour = ColourType.Coloured
                break
            case InstructionShortcut.LD:
                this.state.code.get(this.state.code.length() - 1).node.setColour(ColourType.Current)
                element = this.state.code.get(this.state.code.length() - 2);
                let loaded: SECDElement
                if (element instanceof SECDArray) {
                    element.colour = ColourType.Current
                    let index1 = element.get(1)
                    let index2 = element.get(0)
                    if (!(index1 instanceof SECDValue && index2 instanceof SECDValue))
                        throw Error()
                    let val1 = index1.constant
                    let val2 = index2.constant
                    if ((typeof (val1) != "number") && (typeof (val2) != "number"))
                        throw Error()
                    loaded = InterpreterUtils.evaluateLoad(this.state.environment, val1 as unknown as number, val2 as unknown as number)
                    if (loaded.node.parent instanceof QuoteNode) {//If it is quoted list colour it all
                        loaded.node.parent.colour = ColourType.Coloured
                        loaded.node.parent.setColour(ColourType.Coloured)
                    } else {
                        loaded.colour = ColourType.Coloured;
                        loaded.node.setColour(ColourType.Coloured)
                    }
                } else
                    throw Error()
                break
            case InstructionShortcut.SEL:
                //colour current instruction, condition on top of the stack and 2 branches on the stack
                //colour registers
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                this.state.code.get(this.state.code.length() - 2).colour = ColourType.SecondColoured
                this.state.code.get(this.state.code.length() - 3).colour = ColourType.ThirdColoured
                //colour nodes
                let ifNode = this.state.code.get(this.state.code.length() - 1).node as IfNode
                ifNode.setColour(ColourType.Current)
                ifNode.condition().setColour(ColourType.Coloured)
                ifNode.left().setColour(ColourType.SecondColoured)
                ifNode.right().setColour(ColourType.ThirdColoured)

                break
            case InstructionShortcut.JOIN:
                //colour the top of the dumb, where is new content of the code register
                this.state.dump.get(this.state.dump.length() - 1).colour = ColourType.Coloured;
                this.state.code.get(this.state.code.length() - 1).node.setColour(ColourType.Coloured)
                break
            case InstructionShortcut.NIL:
                break
            case InstructionShortcut.DUM:
                break
            case InstructionShortcut.POP:
                //colour the top of the stack register that will be popped
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                break
            case InstructionShortcut.CONSP:
            case InstructionShortcut.CAR:
            case InstructionShortcut.CDR:
                //colour nodes and registers of argument an operator
                this.state.code.get(this.state.code.length() - 1).node.setColour(ColourType.Current);
                (this.state.code.get(this.state.code.length() - 1).node.parent as UnaryExprNode).expr().setColour(ColourType.Coloured);
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
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
                //colour nodes and registers of arguments an operator
                this.state.code.get(this.state.code.length() - 1).node.setColour(ColourType.Current);
                (this.state.code.get(this.state.code.length() - 1).node.parent as BinaryExprNode).left().setColour(ColourType.Coloured);
                (this.state.code.get(this.state.code.length() - 1).node.parent as BinaryExprNode).right().setColour(ColourType.SecondColoured);
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                this.state.stack.get(this.state.stack.length() - 2).colour = ColourType.SecondColoured
                break
            case InstructionShortcut.CONS:
                //since Cons is sometimes used on empty arrays without nodes, it is coloured differently than other bin instructions
                //just the arguments in registers are coloured, not the node and the operator node has green colour
                this.state.code.get(this.state.code.length() - 1).node.setColour(ColourType.Coloured)
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Coloured
                this.state.stack.get(this.state.stack.length() - 2).colour = ColourType.SecondColoured;
                break
            case InstructionShortcut.LDF:
                //colour the function
                this.state.code.get(this.state.code.length() - 2).colour = ColourType.Coloured;
                this.state.code.get(this.state.code.length() - 2).node.setColour(ColourType.Coloured)
                break
            case InstructionShortcut.AP:
                element = this.state.stack.get(this.state.stack.length() - 1)
                element.colour = ColourType.Current
                node = element.node
                node.setColour(ColourType.Current);
                if (node.parent instanceof ApplicationNode) {
                    //Normal non-recursive lambdas
                    //Here argument will be highlighted even if it is variable in code
                    let args = (node.parent as ApplicationNode).args()
                    if (args instanceof ReduceNode)
                        (args.reduced() as CompositeNode).items().forEach(node => node.setColour(ColourType.Coloured))
                    else
                        (args as CompositeNode).items().forEach(node => node.setColour(ColourType.Coloured))
                } else {
                    //For lambdas defined without argument immediately following them
                    //If argument is list colour it whole
                    if (this.state.stack.get(this.state.stack.length() - 2).node instanceof QuoteNode)
                        this.state.stack.get(this.state.stack.length() - 2).node.setColour(ColourType.Coloured)
                    //Because of recursive functions where argument is in code just once
                    else
                        (this.state.stack.get(this.state.stack.length() - 2) as SECDArray).forEach(element => element.node.setColour(ColourType.Coloured));
                }
                (this.state.stack.get(this.state.stack.length() - 2) as SECDArray).forEach(element => element.colour = ColourType.Coloured);
                break
            case InstructionShortcut.RAP:
                //colour top 2 elements in the stack (function closure and arguments)
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Current
                this.state.stack.get(this.state.stack.length() - 1).node.colour = ColourType.Current;
                (this.state.stack.get(this.state.stack.length() - 2) as SECDArray).get(0).colour = ColourType.Coloured;
                (this.state.stack.get(this.state.stack.length() - 2) as SECDArray).get(0).node.colour = ColourType.Coloured
                break
            case InstructionShortcut.RTN:
                //colour the top of the stack that will be returned and top 3 elements in dumb that will move to other registers
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Current;
                this.state.code.get(this.state.code.length() - 1).node.setColour(ColourType.Current)
                this.state.dump.get(this.state.dump.length() - 2).colour = ColourType.ThirdColoured
                this.state.dump.get(this.state.dump.length() - 3).colour = ColourType.SecondColoured
                this.state.dump.get(this.state.dump.length() - 4).colour = ColourType.Coloured
                break
            case InstructionShortcut.DEFUN:
                //colour top of the stack register
                this.state.code.get(this.state.code.length() - 1).node.setColour(ColourType.Current)
                this.state.stack.get(this.state.stack.length() - 1).colour = ColourType.Current
                break
            case InstructionShortcut.STOP:
                break
            default:
                throw Error()
        }
    }
}