import React from 'react'
import { BoxState } from '../AppTypes'
import { BoxType } from '../Types'
import UntypedLambdaBTB from '../untyped-lambda-integration/BoxTopBar'
import { UntypedLambdaState } from '../untyped-lambda-integration/AppTypes'

import MarkdownBTB from '../markdown-integration/BoxTopBar'
import { NoteState } from '../markdown-integration/AppTypes'


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
  if (type === BoxType.MARKDOWN) {
    return (
      <MarkdownBTB
        state={ state as NoteState }
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