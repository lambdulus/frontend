import React, { Component, ChangeEvent } from 'react'
import { BoxState } from '../AppTypes'

import { NoteState, PromptPlaceholder } from './AppTypes'

import 'pretty-checkbox'
import './styles/EditingSwitch.css'

const { Switch } = require('pretty-checkbox-react')


interface Props {
  state : NoteState
  isActive : boolean
  removeBox : () => void
  updateBoxState : (box : BoxState) => void
}


export default function BoxTopBar (props : Props) : JSX.Element {
  const { state, isActive, removeBox, updateBoxState } = props
  const { note, isEditing } = state

  return (
    <div className='boxTopBar'>
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