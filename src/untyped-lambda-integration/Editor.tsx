import React, { ChangeEvent, KeyboardEvent } from 'react'

import './styles/Editor.css'

// import { EvaluationStrategy } from '../App'


export enum ActionType {
  ENTER_EXPRESSION = 'Enter Expression',
  ENTER_EXERCISE = 'Enter Exercise',
  NEXT_STEP = 'Next Step',
  RUN = 'Run',
  ENTER_MD = 'Enter MarkDown',
}

interface EditorProperties {
  placeholder: string
  content : string
  caretPosition : number
  syntaxError : Error | null
  isMarkDown : boolean
  
  onContent (content : string, caretPosition : number) : void
  onEnter () : void
  onExecute () : void
  // onReset () : void
}

export default function Editor (props : EditorProperties) : JSX.Element {
  const {
    placeholder,
    content,
    caretPosition,
    syntaxError,
    isMarkDown,

    onContent,
    onEnter,
    onExecute,
  } : EditorProperties = props
  const lines : number = content.split('\n').length

  const onChange = (event : ChangeEvent<HTMLTextAreaElement>) => {
    let { target : { value : content } } : { target : { value : string } } = event
    const caretPosition : number = event.target.selectionEnd

    content = content.replace(/\\/g, 'λ')

    onContent(content, caretPosition)
  }

  // TODO: Editor should not decide that - it should only implement onEnter onShiftEnter onCtrlEnter
  const onKeyDown = (event : KeyboardEvent<HTMLTextAreaElement>) => {
    if ( ! event.shiftKey && ! event.ctrlKey && event.key === 'Enter') {
      
      if (isMarkDown) {
        return
      }

      event.preventDefault()
      onEnter()
    }

    if (event.shiftKey && event.key === 'Enter' && isMarkDown) {
      event.preventDefault()
      onEnter()
    }
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault()
      onExecute()
    }

    // TODO: not yet
    // if (event.ctrlKey && event.key === 'r') {
    //   event.preventDefault()
    //   onReset()
    // }
  }

  return (
    <div className='editorContainer'>
      {
        syntaxError ?
        <p className='editorError'>
          { `${syntaxError}` }
        </p>
        :
        null
      }

      <div className="editor">
        <InputField
          placeholder={ placeholder }
          content={ content }
          lines={ lines }
          caretPosition={ caretPosition }
          onChange={ onChange }
          onKeyDown={ onKeyDown }
        />
      </div>
    </div>
  )
}

interface InputProps {
  placeholder : string
  content : string
  lines : number
  caretPosition : number
  onChange (event : ChangeEvent<HTMLTextAreaElement>) : void
  onKeyDown (event : KeyboardEvent<HTMLTextAreaElement>) : void
}

function InputField (props : InputProps) : JSX.Element {
  const { placeholder, content, lines, onChange, onKeyDown, caretPosition } : InputProps = props

  return (
    <textarea
      className='prompt'
      onKeyDown={ onKeyDown }
      onChange={ onChange }
      value={ content }
      placeholder={ placeholder }
      wrap='hard'
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck={ false }
      rows={ Math.max(lines, 1) } 
      ref={ (element : HTMLTextAreaElement) => {
        if (element !== null) {
          element.selectionStart = caretPosition
          element.selectionEnd = caretPosition
          element.focus()
        }
      } }
    />
  )
}