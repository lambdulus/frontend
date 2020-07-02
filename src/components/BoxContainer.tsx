import React, { MouseEvent } from 'react'
import { mapBoxTypeToStr } from '../AppTypes'
import Box from './Box'
import BoxTitleBar from './BoxTitleBar'
import { BoxState } from '../Types'


interface Props {
  isActiveBox : boolean
  isFocusedBox : boolean
  box : BoxState

  makeActive : () => void
  onBlur : () => void
  updateBoxState : (state : BoxState) => void
  removeBox : () => void
  addBoxBefore : (state : BoxState) => void
  addBoxAfter : (state : BoxState) => void
}

export function BoxContainer (props : Props) : JSX.Element {
  const {
    isActiveBox,
    isFocusedBox,
    box,
    makeActive,
    onBlur,
    updateBoxState,
    addBoxBefore,
    addBoxAfter,
    removeBox
  } : Props = props

  const boxTypeClassName : string = mapBoxTypeToStr(box.type)

  return (
    <div
      className={ `boxContainer ${ isActiveBox ? 'active' : 'inactive' } ${boxTypeClassName}` }
      onClick={ makeActive }
      onBlur={ onBlur }
    >
      <BoxTitleBar
        state={ box }
        isActive={ isActiveBox }
        isFocused={ isFocusedBox }
        removeBox={ (e : MouseEvent) => {
          e.stopPropagation()
          removeBox()
         } }
        updateBoxState={ (box : BoxState) => updateBoxState(box) }
        addBoxBefore={ addBoxBefore }
        addBoxAfter={ addBoxAfter }
      />
      <Box
        state={ box }
        isActive={ isActiveBox }
        isFocused={ isFocusedBox }
        updateBoxState={ (box : BoxState) => updateBoxState(box) }
        addBoxAfter={ addBoxAfter }
      />
    </div>
  )
}