import React, { MouseEvent } from 'react'

import { NoteState, onMarkDownBlur } from './AppTypes'

import './styles/EditingSwitch.css'
import { BoxState } from '../Types'

interface Props {
  state : NoteState
  isActive : boolean
  removeBox : (e : MouseEvent) => void
  updateBoxState : (box : BoxState) => void
}


export default function BoxTopBar (props : Props) : JSX.Element {
  const { state, updateBoxState } = props
  const { isEditing, readOnly } = state

  if (readOnly) {
    return (
      <div className='' />
    )
  }

  return (
    <div className=''>
      <div className='markdown-controls' title='Edit as Markdown'>
        {/* This will be separated into it's own component */}
        <div className='markdown-editing'>
          <span
            className={ `markdown-write ${isEditing ? 'markdown-selected' : ''}` }
            onClick={ (e) => {
              e.stopPropagation()
              if (isEditing === false) {
                updateBoxState({ ...state, isEditing : true})
              }
            } }
          >
            Edit
          </span>
          <span
            className={ `markdown-preview ${isEditing ? '' : 'markdown-selected'}` }
            onClick={ (e) => {
              e.stopPropagation()
              if (isEditing === true) {
                // Same submit path as deactivation: a top `#` heading
                // becomes the box title.
                updateBoxState(onMarkDownBlur(state))
              }
            } }
          >
            Preview
          </span>
        </div>
      </div>

      {/* <i
        className='removeBox far fa-trash-alt'
        onClick={ removeBox }
        title='Remove this Box'
      /> */}
    </div>
  )
}