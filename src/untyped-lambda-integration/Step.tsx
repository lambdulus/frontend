import React, { memo } from 'react'
import { ASTReduction } from '@lambdulus/core'

import './styles/Step.css'

import { strategyToEvaluator } from './ExpressionBox'
import ReactPrinter from './ReactPrinter'
// import ReductionMessage from './ReductionMessage'
import { EvaluationStrategy, StepRecord, Breakpoint, Evaluator } from './AppTypes'
// import { StrategyContext } from './DataInjector'


interface StepWrapperProperties {
  stepRecord : StepRecord
  breakpoints : Array<Breakpoint>
  addBreakpoint (breakpoint : Breakpoint) : void
  children : JSX.Element
  lastStep : boolean
}

interface StepProperties {
  stepRecord : StepRecord
  breakpoints : Array<Breakpoint>
  addBreakpoint (breakpoint : Breakpoint) : void
  children : JSX.Element
  strategy : EvaluationStrategy
  lastStep : boolean
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
    <StepMemo { ...props } strategy={ EvaluationStrategy.NORMAL } />
  )
}

function Step (props : StepProperties) : JSX.Element | null {
  const { stepRecord, addBreakpoint, breakpoints, children, strategy } = props
  const { ast : tree, lastReduction, step, message } = stepRecord

  if (tree === null) {
    return null
  }

  const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(tree)
  const reduction : ASTReduction = evaluator.nextReduction
  const printer : ReactPrinter = new ReactPrinter(tree, addBreakpoint, reduction, breakpoints)

  const incorrectStep : boolean = stepRecord.message.indexOf('Incorrect step.') === 0
  const correctStep : boolean = stepRecord.message.indexOf('Correct.') === 0
  const exerciseStep : boolean = incorrectStep || correctStep

  return (
    <span className='step'>
      {/* <ReductionMessage lastReduction={ lastReduction } /> */}
      <div className='inlineblock' >
        <p className='stepNumber' >
          { step } :
        </p>
        { printer.print() }
        { children }
        {
          stepRecord.message === '' ?
            null
            :
            exerciseStep === false ?
            <p className='stepMessage' >
              { stepRecord.message }
            </p>
            :
            incorrectStep === true ?
              <p className='stepMessage incorrect' >
                Incorrect input: <i className='userInput'>`{ stepRecord.message.substr(15) }`</i>
              </p>
            :
              <p className='stepMessage correct' >
                { stepRecord.message }
              </p>
        }
      </div>
    </span>
  )
}