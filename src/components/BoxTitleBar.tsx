import React from 'react'
import { BoxState, BoxType } from '../AppTypes'
import UntypedLambdaBTB from '../untyped-lambda-integration/BoxTopBar'
import { UntypedLambdaState } from '../untyped-lambda-integration/AppTypes'


interface Props {
  state : BoxState
  isActive : boolean
  removeBox : () => void
  updateBoxState : (box : BoxState) => void
}


export default function BoxTitleBar (props : Props) : JSX.Element {
  const { state, isActive, updateBoxState, removeBox } : Props = props
  const { type } = state


  if (type === BoxType.UNTYPED_LAMBDA) {
    return (
      <UntypedLambdaBTB
        state={ state as UntypedLambdaState }
        isActive={ isActive }
        removeBox={ removeBox }
        updateBoxState={ updateBoxState }
      />
    )
  }
  else {
    return (
      <div>
        Uknown BOX
      </div>
    )
  }

}