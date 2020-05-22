import React from 'react'
import { BoxState, mapBoxTypeToStr } from '../AppTypes'
import Box from './Box'
import BoxTitleBar from './BoxTitleBar'
import { BoxType } from '../Types'


interface Props {
  isActiveBox : boolean
  box : BoxState

  makeActive : () => void
  updateBoxState : (state : BoxState) => void
  removeBox : () => void
  insertBefore : (state : BoxState) => void
}

export function BoxContainer (props : Props) : JSX.Element {
  const { isActiveBox, box, makeActive, updateBoxState, insertBefore, removeBox } : Props = props

  const boxTypeClassName : string = mapBoxTypeToStr(box.type)

  return (
    <div
      className={ `boxContainer ${ isActiveBox ? 'active' : 'inactive' } ${boxTypeClassName}` }
      onDoubleClick={ () => makeActive() }
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