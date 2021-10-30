import React, { MouseEvent } from 'react'

import { NoteState } from './AppTypes'

import 'pretty-checkbox'
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
  const { isEditing } = state

  return (
    <div className=''>
      {
      // TODO: Remove This
      /* <div className='topBarTitle' contentEditable={ true } suppressContentEditableWarning={true} onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" }) }>
        { title === "" ? "Click Here to Change the Title" : title }
      </div> */}
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
                updateBoxState({ ...state, isEditing : false})
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