import React, { useContext, ReactNode } from 'react'

import Editor from '../components/Editor'
// import { MakeActiveContext, DeleteBox } from './BoxSpace'
import { StepRecord } from './Types'

import './styles/EmptyExpression.css'

interface EmptyExpressionProps {
  className : string
  isActive : boolean
  isMinimized : boolean
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
  // history : Array<StepRecord>

  onContent (content : string) : void
  onDebug () : void
  onExercise () : void
}


export default function EmptyExpression(props : EmptyExpressionProps) : JSX.Element{
  const { className, isActive, editor, isMinimized } = props
  const {
    placeholder,
    content,
    caretPosition,
    syntaxError,
  } = editor

  // const makeActive = useContext(MakeActiveContext)
  // const deleteBox = useContext(DeleteBox)

  return (
    <div
      className={ `${className} ${isActive ? '' : ' inactiveBox'}` }
    >
      {
        ! isMinimized ?
          (
            <div>
              <Editor
                placeholder={ placeholder } // data
                content={ content } // data
                syntaxError={ syntaxError } // data
                submitOnEnter={ false } // data
                shouldReplaceLambda={ true }

                onContent={ props.onContent } // fn
                onEnter={ () => void 0 } // fn
                onCtrlEnter={ props.onDebug }
                onShiftEnter={ props.onExercise }
                onExecute={ () => void 0 } // fn
              />

              <div className='debug-controls'>
                <button
                  title='Debug this Expression in the Evaluator (Ctrl + Enter)'
                  type="button"
                  className='open-as-debug btn'
                  onClick={ props.onDebug }
                >
                  <span
                    className='untyped-lambda--submit-expression--btn-label'
                  >
                    Debug
                  </span>
                </button>
                
                <button
                  title='Exercise this Expression Yourself (Shift + Enter)'
                  type="button"
                  className='open-as-exercise btn'
                  onClick={ props.onExercise }
                >
                  <span className='untyped-lambda--submit-expression--btn-label'>Exercise</span>
                </button>
              </div>
            </div>
          )
          :
          (
            <div>
              <p className='inactiveMessage'>
                Collapsing Empty Expression Box. Click to activate this box.
              </p>
            </div>
          )
      }
    </div>
  )
}