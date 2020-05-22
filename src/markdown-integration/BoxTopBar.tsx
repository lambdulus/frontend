import React, { Component, ChangeEvent } from 'react'

import { NoteState, PromptPlaceholder } from './AppTypes'

import 'pretty-checkbox'
import './styles/EditingSwitch.css'
import { BoxState } from '../Types'

const { Switch } = require('pretty-checkbox-react')


interface Props {
  state : NoteState
  isActive : boolean
  removeBox : () => void
  updateBoxState : (box : BoxState) => void
}


export default function BoxTopBar (props : Props) : JSX.Element {
  const { state, isActive, removeBox, updateBoxState } = props
  const { note, isEditing, title } = state

  return (
    <div className='boxTopBar'>
      <div className='topBarTitle' contentEditable={ true } onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" }) }>
        { title === "" ? "Click Here to Change the Title" : title }
      </div>
      <div className='controls' title='Edit as Markdown'>
        <Switch
            className='control'
            checked={ isEditing }
            onChange={ (e : ChangeEvent<HTMLInputElement>) =>
              updateBoxState({ ...state, isEditing : e.target.checked })
            }
            shape="fill"
          >
            Editing
          </Switch>
      </div>

      <i
        className='removeBox far fa-trash-alt'
        onClick={ removeBox }
        title='Remove this Box'
      />
    </div>
  )
}