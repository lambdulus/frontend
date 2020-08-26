import React, { MouseEvent, PureComponent } from 'react'
import { mapBoxTypeToStr } from '../AppTypes'
import Box from './Box'
import BoxTitleBar from './BoxTitleBar'
import { BoxState, GlobalSettings, BoxesWhitelist } from '../Types'

import "../styles/BoxContainer.css"


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
  settings : GlobalSettings
  whiteList : BoxesWhitelist
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

  const { settingsOpen } : BoxState = box

  const boxTypeClassName : string = mapBoxTypeToStr(box.type)

  return (
    <div
      className={ `boxContainer ${ isActiveBox ? 'active' : 'inactive' } ${boxTypeClassName}` }
      onClick={ makeActive }
      onBlur={ onBlur }
      ref={ (elem : any) => {
        // This is just temporary
        // should be replaced with much finer logic
        // like: store ref to the state and then scroll to the part of the Box which should be visible
        // depending on the action user just did
        // for now - it will do
        if (elem !== null && isActiveBox) {
          const boundingRect = elem.getBoundingClientRect()
          const viewportHeight : number = window.innerHeight
          if (boundingRect.bottom > viewportHeight) {
            elem.scrollIntoView(false)
          }
        }
      } }
    >
      <BoxTitleBar
        state={ box }
        isActive={ isActiveBox }
        isFocused={ isFocusedBox }
        removeBox={ (e : MouseEvent) => {
          e.stopPropagation()
          removeBox()
        } }
        updateBoxState={ updateBoxState }
        addBoxBefore={ addBoxBefore }
        addBoxAfter={ addBoxAfter }
        settings={ props.settings }
        whiteList={ props.whiteList }
      />
      
      <Box
        state={ box }
        isActive={ isActiveBox }
        isFocused={ isFocusedBox }
        updateBoxState={ updateBoxState }
        addBoxAfter={ addBoxAfter }
      />
    </div>
  )
}