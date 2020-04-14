import React, { ChangeEvent } from 'react'

import 'pretty-checkbox'
import './styles/ExerciseSwitch.css'

const { Switch } = require('pretty-checkbox-react')


export interface ControlsProps {
  isExercise : boolean
  makeExercise () : void
  endExercise () : void
}

// TODO: maybe not really needed or rename it accordingly
export default function ExerciseSwitch (props : ControlsProps) : JSX.Element {
  const {
    isExercise,
    makeExercise,
    endExercise,
  } : ControlsProps = props

  return (
    <div id="controls">
      <div title='Write the next step yourself'>
        <Switch
          className='control'
          checked={ isExercise }
          onChange={ (e : ChangeEvent<HTMLInputElement>) =>
            e.target.checked ? makeExercise() : endExercise()
          }
          shape="fill"
        >
          Exercise
        </Switch>
      </div>
    </div>
  )
}