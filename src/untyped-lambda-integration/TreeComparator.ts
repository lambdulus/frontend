import { AST, Lambda, Application, Macro, ChurchNumeral, Variable } from "@lambdulus/core"

///////////////////////////////////////////////////////////////////////////////////////

type Pair<T> = [T, T]
type Triple<T> = [T, T, T]


// TODO: fix the public equals interface, maybe public get and private set?
// maybe implement public get method and bool itself leave private?
//
// first I need more trees, I need the previous AST
export class TreeComparator {
  private translator : Map<string, string> = new Map
  public equals : boolean = true
  private context : Pair<AST>

  constructor (readonly roots : Pair<AST> ) {
    [ ...this.context ] = roots
    // TODO: I need to compare roots first
    this.compare()
  }

  compare () : void {
    /**
    TODO: compare need to compare both children if got
    if one of them is incorrect
    then solve that problem
    if both of them is incorrect
    then solve both problems and then decide how both come together

    then I have an instance of knowledge system
    I can fire up that system in this context (this node with invalid children)
    system will need to get instance of something to call methods on
    because system needs to ask questions - like, is this possible,
    is this error applicable?
    so instead of human, code will look up the AST and answer the questions
    so it will be some kind of class which is able to observe all 3 ASTs at the same time
    it will also have implemented query methods,
    probably wont be many of them, just few
    **/
    
    const [ left, right ] : Pair<AST> = this.context

    if (left instanceof Lambda && right instanceof Lambda) {
      const backup : Map<string, string> = new Map(this.translator.entries())

      this.translator.set(left.argument.name(), right.argument.name())
      this.context = [ left.right, right.right ]
      this.compare()

      this.translator = backup
    }
    else if (left instanceof Application && right instanceof Application) {
      this.context = [ left.left, right.left ]
      this.compare()

      if ( ! this.equals) {
        return
      }

      this.context = [ left.right, right.right ]
      this.compare()
    }
    else if (left instanceof Macro && right instanceof Macro) {
      this.equals = left.name() === right.name()
    }
    else if (left instanceof ChurchNumeral && right instanceof ChurchNumeral) {
      this.equals = left.name() === right.name()
    }
    else if (left instanceof Variable && right instanceof Variable) {
      if (this.translator.has(left.name())) {
        this.equals = this.translator.get(left.name()) === right.name()
      }
      else {
        this.equals = left.name() === right.name()
      }
    }
    else {
      this.equals = false
    }
  }
}