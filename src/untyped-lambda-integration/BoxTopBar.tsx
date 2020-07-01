import React, { Component, MouseEvent } from 'react'

import Controls from './ExerciseSwitch'
import { UntypedLambdaState, PromptPlaceholder } from './AppTypes'
import { BoxState } from '../Types'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  removeBox : (e : MouseEvent) => void
  updateBoxState : (box : BoxState) => void
}


export default function BoxTopBar (props : Props) : JSX.Element {
  const { state, isActive, removeBox, updateBoxState } = props
  const { isExercise, editor, expression, title } = state

  return (
    <div className=''>
      {/* {
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
      } */}

      {/* <i
        className='removeBox far fa-trash-alt'
        onClick={ removeBox }
        title='Remove this Box'
      /> */}

      {/* {
        state.minimized ?
          <i
            className="imizeBox fas fa-sort-down"
            onClick={ (e : MouseEvent) => {
              e.stopPropagation()
              updateBoxState({ ...state, minimized : false })
            } }
            title='Expand this Box'
          />
          :
          <i
            className="imizeBox fas fa-sort-up"
            onClick={ (e : MouseEvent) => {
              e.stopPropagation()
              updateBoxState({ ...state, minimized : true })
            } }
            title='Collapse this Box'
          />
      } */}
    </div>
  )
}