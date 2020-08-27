import React from 'react'

import { ASTVisitor, Lambda, Variable, Beta, AST, Application, ChurchNumeral, Expansion, Macro, ASTReduction, Alpha, Gama, ASTReductionType } from "@lambdulus/core"
import { Breakpoint } from './Types'
import { reportEvent } from '../misc';
import { MacroBeta } from './AppTypes';


export default class ReactPrinter extends ASTVisitor {
  private rendered : JSX.Element | null = null
  private argument : Variable | null = null

  // TODO: this is just temporary and very dirty hot fix
  // because findSimplifiedReduction needs to get clonned tree
  // because it modifies that tree even thought it probably shoudl not
  // actual tree being printed is not the same
  // this then leads to some problem when expression is being copied (argument used mutliple times inside lambda)
  // and one of them is then identified as a REDEX
  // because all of them share same Identifier --> all of them are identified as a redex
  // private foundRedexes : Array<symbol> = []
  // on the other hand -- this is not so dirty right?
  private redexesFound : number = 0 // 0 is empty ; 1 is found ; -1 is blocked and can't be set to 1 again
  // NOW: be very careful
  // this solution unfortunately combines both of the original solutions and this means it probably takes
  // the worst of both of them
  // what it means is this:
  // it relies on correct logic that sets reduction.topLevelParent
  // there could very well be bug and it could work badly
  // also it relies on order
  // once the redexFound was set to 1 it will be set to -1 and then it cannot be set again
  // this means - I efectively say - only first occurence of the expression can be the REDEX
  // be very aware that this might be very ill and really buggy
  //
  //
  // final decision is to dith all of the above
  // and just go with counting --> logic seems sound --> if I arrive somewhere first when printing
  // in the same order I look for the redexes (in normal order at least I hope) --> it should be redex
  // rest is fake

  private printMultiLambda (lambda : Lambda, accumulator : JSX.Element) : void {
    if (lambda.body instanceof Lambda) {
      const context : Variable = lambda.body.argument
      let className : string = 'argument'
      let title : string = ''

      if (this.isBreakpoint(lambda.body.argument)) {
        className += ' breakpoint'
        title = 'Will break on substitution'
      }

      // bug@highlight-alpha
      let set = false
      if (this.reduction instanceof Alpha
            &&
          Array.from(this.reduction.conversions).some((conversion : Lambda) => {
            return conversion.identifier === lambda.body.identifier
          })
          ) {
              this.argument = context
              set = true
              className += ' alpha'
      }

      // TO JE KVULI FIXU MULTILAMBDA FACCT 3 beta redukce nad shadowingem
      let argument : Variable | null = this.argument
      if (this.argument !== lambda.body.argument
          &&
          this.argument !== null
          &&
          this.argument.name() === lambda.body.argument.name()) {
        this.argument = null
      } // TO JE KVULI FIXU MULTILAMBDA FACCT 3 beta redukce nad shadowingem

      // TODO: same here
      if (this.argument
          &&
          this.argument.name() === context.name()) {
            className += ' substitutedArg'
        }

      const args : JSX.Element = (
        <span className='arguments'>
          { accumulator } {' '}
          <span
            className={ className }
            title={ title }
            onClick={ () => {
              (context as any).identifier = Symbol()
              this.onClick({ type : ASTReductionType.BETA, context, broken : new Set })
              reportEvent('Breakpoint added to argument', 'Breakpoint was added', '')
            }
            }
          >
            { context.name() }
          </span>
        </span>
      )
      
      this.printMultiLambda(lambda.body, args)
      if (set === true) {
        this.argument = null
      }
      this.argument = argument // TO JE KVULI FIXU MULTILAMBDA FACCT 3 beta redukce nad shadowingem
    }
    else {
      lambda.body.visit(this)
      const body : JSX.Element | null = this.rendered
      this.rendered = accumulator

      this.rendered = (
        <span className='function'>
          (
          <span
            className='lambda'
            >
              λ { ' ' }
          </span>
          { accumulator } . { body }
          )
        </span>
      )
    }
  }

  isBreakpoint (node : AST) : boolean {
    for (const breakpoint of this.breakpoints) {
      if (breakpoint.context.identifier === node.identifier) {
        return true
      }
    }
    return false
  }

  constructor (
    public readonly tree : AST,
    private readonly onClick : (breakpoint : Breakpoint) => void,
    private readonly reduction : ASTReduction,
    private readonly breakpoints : Array<Breakpoint>,
    private readonly SDE : boolean,
  ) {
    super()
    this.tree.visit(this)
  }

  print () : JSX.Element | null {
    return this.rendered
  }

  // TODO: little bit refactored, maybe keep going
  onApplication (application: Application) : void {
    let className : string = 'application'
    let leftClassName : string = 'left'
    let rightClassName : string = 'right'
    let set : boolean = false
    let redex : AST | null = null

    if (this.reduction instanceof Beta) {
      redex = this.reduction.redex
    }

    if (this.reduction instanceof MacroBeta) {
      // if (this.redexFound === 0 && application.identifier === this.reduction.topLevelParent.identifier) {
      //   this.redexFound = 1
      //   redexFoundFlag = true
      //   debugger
      // }
      
      //  === 1 && 
      if (this.redexesFound < this.reduction.arity && this.reduction.applications.some((app : Application) => app.identifier === application.identifier)) {
        if (application.left instanceof Macro) {
          leftClassName += ' extended-redex'
        }

        this.redexesFound++
        
        rightClassName += ' extended-redex'
        console.log('bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
      }
    }

    if (this.reduction instanceof Gama && this.reduction.args.includes(application)) {
      className += ' redex abstraction argument'
    }

    // else if (this.reduction instanceof Expansion) {
    //   redex = this.reduction.target
    // } // to asi neni uplne potreba tady

    if (redex !== null
          &&
        redex.identifier === application.identifier // tohle je asi trosku useles
          &&
        redex === application
      ) {
        leftClassName += ' redex'
        rightClassName += ' redex'

        // TODO: this is probably not good and should be done other way

        if (application.left instanceof Lambda) {
          this.argument = application.left.argument
          set = true
        }
    }

    if (application.right instanceof Application) {
      application.left.visit(this)
      const left : JSX.Element | null = <span className={ leftClassName }>{this.rendered}</span>

      // tohle delam proto, ze se nesmi vypnout this.argument u libovolne aplikace, jenom u te ktera ho setnula
      // priklad + 2 3 a krokuj - zakomentuj a krokuj znovu Y se bude chovat spatne hned v prvnich krocich
      if (set) {
        this.argument = null
      }

      application.right.visit(this)
      const right : JSX.Element | null = <span className={ rightClassName }>( { this.rendered } )</span>

      this.rendered =
      <span className={ className }>
        { left } { right }
      </span>
    }
    else {
      application.left.visit(this)
      const left : JSX.Element | null = <span className={ leftClassName }>{this.rendered}</span>

      // tohle delam proto, ze se nesmi vypnout this.argument u libovolne aplikace, jenom u te ktera ho setnula
      // priklad + 2 3a krokuj - zakomentuj a krokuj znovu Y se bude chovat spatne hned v prvnich krocich
      if (set) {
        this.argument = null
      }

      application.right.visit(this)
      const right : JSX.Element | null = <span className={ rightClassName }>{ this.rendered }</span>

      this.rendered =
      <span className={ className }>
        { left } { right }
      </span>
    }
  }
  
  // TODO: little bit refactored, maybe keep going
  onLambda (lambda: Lambda) : void {
    // TODO: this also seems not so elegant and clean

    let title : string = ''

    let argument : Variable | null = this.argument
    if (this.argument !== lambda.argument
        &&
        this.argument !== null
        &&
        this.argument.name() === lambda.argument.name()) {
      this.argument = null
    }


    // multilambda
    if (lambda.body instanceof Lambda) {
      const context : Variable = lambda.argument
      let className : string = 'argument'

      if (this.isBreakpoint(lambda.argument)) {
        className += ' breakpoint'
        title = 'Will break on substitution'
      }

      // TODO: same here
      if (this.argument
        &&
        this.argument.name() === context.name()) {
          className += ' substitutedArg'
      }

      // if (this.reduction instanceof Alpha) {
      //   className += ' alpha'
      // }

      const acc : JSX.Element = (
        <span
          className={ className }
          title={ title }
          onClick={ () => {
            (context as any).identifier = Symbol()
            this.onClick({ type : ASTReductionType.BETA, context, broken : new Set })
            reportEvent('Breakpoint added to argument', 'Breakpoint was added', '')
          }
          }
        >{ lambda.argument.name() }
        </span>
      )

      this.printMultiLambda(lambda, acc)
    }
    else {
      const context : Variable = lambda.argument

      // lambda.argument.visit(this)
      
      // const args : JSX.Element | null = this.rendered

      lambda.body.visit(this)
      const body : JSX.Element | null = this.rendered

      let className : string = 'argument'
      let title : string = ''

      if (this.isBreakpoint(lambda.argument)) {
        className += ' breakpoint'
        title = 'Will break on substitution'
      }

      // TODO: same here
      if (this.argument
        &&
        this.argument.name() === context.name()) {
          className += ' substitutedArg'
      }

      this.rendered = (
        <span className='function' >
          (
          <span
            className='lambda'
            >
              λ { ' ' }
          </span>
          <span
            className='arguments'
            onClick={ () => {
              (context as any).identifier = Symbol()
              // TODO: for now it does nothing - maybe delete in the future            
              // this.onClick({ type : Beta, context, broken : new Set })
              // reportEvent('Breakpoint added to argument', 'Breakpoint was added', '')
            }
            }
          >
            <span
                className={ className }
                title={ title }
                onClick={ () => {
                  (context as any).identifier = Symbol()
                  this.onClick({ type : ASTReductionType.BETA, context, broken : new Set })
                  reportEvent('Breakpoint added', 'Breakpoint was added', '')
                }
                }
            >
              { lambda.argument.name() }
            </span>
            { ' ' }
          </span>
          . { body } 
          )
        </span>
      )
    }

    this.argument = argument
    if (argument !== null) {
      this.argument = argument
    }
  }
  
  // TODO: little bit refactored, maybe keep going
  onChurchNumeral (churchNumber: ChurchNumeral) : void {
    let className : string = 'churchnumeral'
    let redex : AST | null = null
    let redexClass : string = ' redex'
    let title : string = ''

    if (this.reduction instanceof Expansion) {
      redex = this.reduction.target
    }

    if (this.reduction instanceof Gama && this.reduction.args.includes(churchNumber)) {
      className += ' redex abstraction argument'
    }

    if (redex !== null
          &&
        redex.identifier === churchNumber.identifier
          &&
        redex === churchNumber
      ) {
        className += redexClass
    }

    if (this.isBreakpoint(churchNumber)) {
      className += ' breakpoint'
      title = 'Will break on Expansion'
    }

    this.rendered = (
      <span
        className={ className }
        title={ title }
        onClick={ () => {
          (churchNumber as any).identifier = Symbol()
          this.onClick({ type: ASTReductionType.EXPANSION, context : churchNumber, broken : new Set })
          reportEvent('Breakpoint added to ChurchNumeral', 'Breakpoint was added', '')
        }
        }
      >
        { churchNumber.name() }
      </span>
    )
  }

  // TODO: little bit refactored, maybe keep going  
  onMacro (macro: Macro) : void {
    console.log(this.reduction)
    let className = 'macro'
    let redex : AST | null = null
    let redexClass : string = ' redex'
    let title : string = ''

    if (this.reduction instanceof Expansion) {
      redex = this.reduction.target
    }

    if (this.reduction instanceof Gama) {
      if (this.reduction.redexes.includes(macro)) {
        [ redex ] = this.reduction.redexes
        className += redexClass + ' abstraction'
      }


      if (this.reduction.args.includes(macro)) {
        className += redexClass + ' abstraction argument'
      }
    }

    if (this.reduction instanceof MacroBeta) {
      
      if (macro.identifier === this.reduction.applications[0].left.identifier) {
        className += ' abstraction'
        console.log('............................................------------------.................................')
      }
      console.log("MMMMMMMMMMMMMMMMACROBEEEEEEEEEEEEEEEEEEEEEETAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")

    }


    if (redex !== null
          &&
        redex.identifier === macro.identifier
          &&
        redex === macro
        ) {
      className += redexClass
    }

    if (this.isBreakpoint(macro)) {
      className += ' breakpoint'
      title = 'Will break on Expansion'
    }

    this.rendered = (
      <span
        className={ className }
        title={ title }
        onClick={ () => {
          (macro as any).identifier = Symbol()
          this.onClick({ type: ASTReductionType.EXPANSION, context : macro, broken : new Set })
          reportEvent('Breakpoint added to Macro', 'Breakpoint was added', '')
        }
        }
      >
        { macro.name() }
      </span>
    )
  }
  
  onVariable (variable: Variable): void {
    // TODO: same here - not so clean
    let className : string = 'variable'

    if (this.argument
        &&
        this.argument.name() === variable.name()) {
          className += ' substitutedArg'
          if (this.reduction instanceof Alpha) {
            className += ' alpha'
          }
      }

    this.rendered = <span className={ className } >{ variable.name() }</span>
  }
}