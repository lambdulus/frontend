import React from 'react'

import { BoxState } from '../Types'
import { UntypedLambdaState, UntypedLambdaType, UntypedLambdaExpressionState, UntypedLambdaMacroState } from './Types'
import ExpressionBox from './ExpressionBox'
import Macro from './Macro'
import MacroList from './MacroList'
import { UNTYPED_LAMBDA_INTEGRATION_STATE } from './AppTypes'

// import macroctx from './MacroContext'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
}

export default function UntypedLambdaBox (props : Props) : JSX.Element {
  const { state } : Props = props
  const { subtype, macrolistOpen } : UntypedLambdaState = state

  const renderBox = () => {
    switch (subtype) {
      case UntypedLambdaType.ORDINARY: {
        const exprState : UntypedLambdaExpressionState = state as UntypedLambdaExpressionState
        return <ExpressionBox { ...props } state={ exprState } macroContext={ UNTYPED_LAMBDA_INTEGRATION_STATE } />
      }
  
      case UntypedLambdaType.EXERCISE:
        return <div>Exercise Box not implemented</div>
    
      case UntypedLambdaType.MACRO: {
        const macroState : UntypedLambdaMacroState = state as UntypedLambdaMacroState
        return <Macro { ...props } state={ macroState} macroContext={ UNTYPED_LAMBDA_INTEGRATION_STATE } />
      }
    }
  }

  return (
    <div>
      {
        macrolistOpen ?
          <div className='untyped-lambda-box--macrolist'>
            <MacroList macroTable={ state.macrotable }  />
            {/* // TODO: this will just get this? */}
          </div>
        :
          null
      }

      { renderBox() }

    </div>
  )
}