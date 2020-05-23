import React from 'react'
import { mapBoxTypeToStr } from '../AppTypes'
import Box from './Box'
import BoxTitleBar from './BoxTitleBar'
import { BoxState } from '../Types'


interface Props {
  isActiveBox : boolean
  box : BoxState

  makeActive : () => void
  onBlur : () => void
  updateBoxState : (state : BoxState) => void
  removeBox : () => void
  insertBefore : (state : BoxState) => void
}

export function BoxContainer (props : Props) : JSX.Element {
  const { isActiveBox, box, makeActive, onBlur, updateBoxState, insertBefore, removeBox } : Props = props

  const boxTypeClassName : string = mapBoxTypeToStr(box.type)

  return (
    <div
      className={ `boxContainer ${ isActiveBox ? 'active' : 'inactive' } ${boxTypeClassName}` }
      onClick={ () => makeActive() }
      onBlur={ onBlur }
    >
      <BoxTitleBar
        state={ box }
        isActive={ isActiveBox }
        removeBox={ () => removeBox() }
        updateBoxState={ (box : BoxState) => updateBoxState(box) }
      />
      <Box
        state={ box }
        isActive={ isActiveBox }
        updateBoxState={ (box : BoxState) => updateBoxState(box) }
        addBox={ (box : BoxState) => insertBefore(box) }
      />
    </div>
  )
}