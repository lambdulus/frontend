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
    <div className='boxTopBar'>
      {/* <div className='topBarTitle' contentEditable={ true } onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" }) }>
        { title === "" ? "Click Here to Change the Title" : title }
      </div> */}
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