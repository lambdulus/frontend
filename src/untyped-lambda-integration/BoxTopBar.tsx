import React, { Component } from 'react'
import { BoxState } from '../AppTypes'

import Controls from './ExerciseSwitch'
import { UntypedLambdaState, PromptPlaceholder } from './AppTypes'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  removeBox : () => void
  updateBoxState : (box : BoxState) => void
}


export default function BoxTopBar (props : Props) : JSX.Element {
  const { state, isActive, removeBox, updateBoxState } = props
  const { isExercise, editor, expression } = state

  return (
    <div className='boxTopBar'>
      {
        expression === '' ?
          null
        :
        <Controls
          isExercise={ isExercise }
          makeExercise={ () =>
            updateBoxState({
              ...state,
              isExercise : true,
              editor: {
                ...state.editor,
                placeholder : PromptPlaceholder.VALIDATE_MODE,
              },
            })
          }
          endExercise={ () =>
            updateBoxState({
              ...state,
              isExercise : false,
              editor: {
                ...state.editor,
                placeholder : PromptPlaceholder.EVAL_MODE,
              },
            })
          }
        />
      }

      <i
        className='removeBox far fa-trash-alt'
        onClick={ removeBox }
        title='Remove this Box'
      />
    </div>
  )
}