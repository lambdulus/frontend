import React from 'react'

import Step from './Step'

import { Breakpoint, StepRecord, UntypedLambdaState, EvaluationStrategy } from './Types'
import { MacroMap } from '@lambdulus/core'


interface InactiveExpressionProps {
  className : string
  breakpoints : Array<Breakpoint>
  history : Array<StepRecord>
  strategy : EvaluationStrategy
  SDE : boolean
  macrotable : MacroMap

  createBoxFrom (stepRecord : StepRecord, macrotable : MacroMap) : UntypedLambdaState
}


export default function InactiveExpression (props : InactiveExpressionProps) : JSX.Element {
  const { className, SDE, macrotable } = props
  // const deleteBox = useContext(DeleteBox)
  // const makeActive = useContext(MakeActiveContext)

  return (
    <div
      className={ className + ' inactiveBox' }
    >
      <ul className='UL'>
        <li key={ 0 } className='activeStep LI'>
          <Step
            breakpoints={ props.breakpoints }
            strategy={ props.strategy }
            addBreakpoint={ () => {} } // blank function - NOOP
            stepRecord={ props.history[0] }
            lastStep={ false }
            SDE={ SDE }
            macrotable={ macrotable }
          >
            <p></p>
          </Step>
        </li>
      </ul>
      <p className='inactiveMessage'>
        Collapsing { props.history.length - 1 } { props.history.length === 2 ? 'step' : 'steps' }. Click to activate this box.
      </p>
    </div>
  )
}
