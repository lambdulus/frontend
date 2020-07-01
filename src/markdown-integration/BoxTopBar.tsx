import React, { Component, ChangeEvent, MouseEvent } from 'react'

import { NoteState, PromptPlaceholder } from './AppTypes'

import 'pretty-checkbox'
import './styles/EditingSwitch.css'
import { BoxState } from '../Types'

const { Switch } = require('pretty-checkbox-react')


interface Props {
  state : NoteState
  isActive : boolean
  removeBox : (e : MouseEvent) => void
  updateBoxState : (box : BoxState) => void
}


export default function BoxTopBar (props : Props) : JSX.Element {
  const { state, isActive, removeBox, updateBoxState } = props
  const { note, isEditing, title } = state

  return (
    <div className=''>
      {
      // TODO: Remove This
      /* <div className='topBarTitle' contentEditable={ true } onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" }) }>
        { title === "" ? "Click Here to Change the Title" : title }
      </div> */}
      <div className='markdown-controls' title='Edit as Markdown'>
        
        {/* This will be separated into it's own component */}
        <div className='markdown-editing'>
          <span
            className={ `markdown-write ${isEditing ? 'markdown-selected' : ''}` }
            onClick={ () => updateBoxState({ ...state, isEditing : true}) }
          >
            Write
          </span>
          <span
            className={ `markdown-preview ${isEditing ? '' : 'markdown-selected'}` }
            onClick={ () => updateBoxState({ ...state, isEditing : false}) }
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