import React, { useContext, ReactNode } from 'react'

import Editor from '../components/Editor'
// import { MakeActiveContext, DeleteBox } from './BoxSpace'
import { StepRecord } from './Types'

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

  onContent (content : string) : void
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
                syntaxError={ syntaxError } // data
                submitOnEnter={ true } // data
                shouldReplaceLambda={ true }

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
                Collapsing { Math.max(0, props.history.length - 1) } { props.history.length === 2 ? 'step' : 'steps' }. Click to activate this box.
              </p>
              </div>
          )
      }
    </div>
  )
}