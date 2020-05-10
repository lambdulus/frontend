import React, { useContext, ReactNode } from 'react'

import Editor from '../components/Editor'
import BoxTopBar from './BoxTopBar'
// import { MakeActiveContext, DeleteBox } from './BoxSpace'
import { StepRecord } from './AppTypes'

interface EmptyExpressionProps {
  className : string
  isActive : boolean
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
  history : Array<StepRecord>

  onContent (content : string, caretPosition : number) : void
  onEnter () : void
  onExecute () : void
}


export default function EmptyExpression(props : EmptyExpressionProps) : JSX.Element{
  const { className, isActive, editor } = props
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
        isActive ?
          (
            <div>
              <Editor
                placeholder={ placeholder } // data
                content={ content } // data
                caretPosition={ caretPosition } // data
                syntaxError={ syntaxError } // data
                isMarkDown={ false } // data

                onContent={ props.onContent } // fn
                onEnter={ props.onEnter } // fn // tohle asi bude potreba
                onExecute={ props.onExecute } // fn // tohle asi bude potreba
              />
            </div>
          )
          :
          (
            <div>
              <p className='inactiveMessage'>
                Collapsing { Math.max(0, props.history.length - 1) } { props.history.length === 2 ? 'step' : 'steps' }. Double click to activate this box.
              </p>
              </div>
          )
      }
    </div>
  )
}