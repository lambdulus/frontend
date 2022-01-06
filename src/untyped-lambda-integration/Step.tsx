import React, { memo } from 'react'
import { ASTReduction, AST, MacroMap, None } from '@lambdulus/core'

import './styles/Step.css'

import ReactPrinter from './ReactPrinter'
import { EvaluationStrategy, StepRecord, Breakpoint, Evaluator, StepValidity } from './Types'
import ReductionMessage from './ReductionMessage'
import { strategyToEvaluator, findSimplifiedReduction, MacroBeta } from './AppTypes'


interface StepWrapperProperties {
  stepRecord : StepRecord
  breakpoints : Array<Breakpoint>
  strategy : EvaluationStrategy
  addBreakpoint (breakpoint : Breakpoint) : void
  children : JSX.Element
  lastStep : boolean
  SDE : boolean
  macrotable : MacroMap
}

interface StepProperties {
  stepRecord : StepRecord
  breakpoints : Array<Breakpoint>
  addBreakpoint (breakpoint : Breakpoint) : void
  children : JSX.Element
  strategy : EvaluationStrategy
  lastStep : boolean
  SDE : boolean
  macrotable : MacroMap
}

// This is done because of highlighting - if Strategy is changed ->
// old steps should not be re-highlighted with changed Strategy - but stay same
const StepMemo = memo(Step, (props : StepProperties) => !props.lastStep)

export default function StepWrapper (props : StepWrapperProperties) : JSX.Element {
  // return(
  //   <StrategyContext.Consumer>
  //     { 
  //       (strategy : EvaluationStrategy) => <StepMemo { ...props } strategy={ strategy } />
  //     }
  //   </StrategyContext.Consumer>
  // )
  return(
    <StepMemo { ...props } />
  )
}

function Step (props : StepProperties) : JSX.Element | null {
  const { stepRecord, addBreakpoint, breakpoints, children, strategy, SDE, macrotable } = props
  const { ast : tree, lastReduction, step, message, exerciseStep } = stepRecord
  const { validity } = message

  if (tree === null) {
    return null
  }

  // const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(tree)
  const newast : AST = tree.clone()
  let nextReduction = (() => {
    if (SDE) {
      return findSimplifiedReduction(newast, strategy, macrotable)[0]
    }
    else {
      const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(tree)
      return evaluator.nextReduction
    }
  })()

  if ( ! (nextReduction instanceof MacroBeta) && !(nextReduction instanceof None)) {
    // TODO: read carefully
    // this means -- next reduction is gonna be normal stuff (Beta, Alpha, Expansion)
    // because of some decision to structure the findSimplifiedReduction the way it works
    // mainly := first clone the tree and then mutate it with each recursive call
    // if it's the normal stuff --> then the tree I used to identify the redex is not the same tree as I am giving to the ReactSECDPrinter
    // for this reason I have to use redex finder which does not mutate the tree under my hands at least until I rewrite
    // the findSimplifiedReduction
    const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(tree)
    nextReduction = evaluator.nextReduction
    // TODO: read carefully
    // this definitely needs to be fixed
    // I will most certainly need to do some dirty magic in ReactSECDPrinter - because this design also makes it impossible
    // to decide what is current redex in expressions like:
    // (λ x . + x x) ( + 1 2 )
    // + [( + 1 2 )] [( + 1 2 )]
    // both [( + 1 2 )] are highlighted
    // but maybe its not related to this
  }
  const reduction : ASTReduction = nextReduction
  const printer : ReactPrinter = new ReactPrinter(tree, addBreakpoint, reduction, breakpoints, SDE)

  // const incorrectStep : boolean = stepRecord.message.indexOf('Incorrect step.') === 0
  // const correctStep : boolean = stepRecord.message.indexOf('Correct.') === 0
  // const exerciseStep : boolean = incorrectStep || correctStep

  return (
    <span className='step'>
      <ReductionMessage lastReduction={ lastReduction } />
      <div className='inlineblock' >
        <p className='stepNumber' >
          { step } :
        </p>
        { printer.print() }
        { children }
        {
          stepRecord.message.message === '' ?
            null
            :
            exerciseStep === false ?
            <p className='stepMessage' >
              { stepRecord.message.message }
            </p>
            :
            validity === StepValidity.INCORRECT ?
              <p>
                <p className='stepMessage incorrect' >
                  Your input is incorrect!
                  <br /> It was: 
                    <i className='userInput'>`{ stepRecord.message.message.substr(15) }`</i>
                  <br />
                </p>
                <p className='stepMessage'>Continue from the next step please.</p>
              </p>
            :
              <p className='stepMessage correct' >
                { stepRecord.message.message }
              </p>
        }
      </div>
    </span>
  )
}