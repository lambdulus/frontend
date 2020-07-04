import React from 'react'

import { BoxState } from '../Types'
import { UntypedLambdaState, UntypedLambdaType, UntypedLambdaExpressionState, UntypedLambdaMacroState } from './Types'
import ExpressionBox from './ExpressionBox'
import Macro from './Macro'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
}

export default function UntypedLambdaBox (props : Props) : JSX.Element {
  const { state } : Props = props
  const { subtype } : UntypedLambdaState = state

  switch (subtype) {
    case UntypedLambdaType.ORDINARY: {
      const exprState : UntypedLambdaExpressionState = state as UntypedLambdaExpressionState
      return <ExpressionBox { ...props } state={ exprState } />
    }

    case UntypedLambdaType.EXERCISE:
      return <div>Exercise Box not implemented</div>
  
    case UntypedLambdaType.MACRO: {
      const macroState : UntypedLambdaMacroState = state as UntypedLambdaMacroState
      return <Macro { ...props } state={ macroState} />
    }
  }
}