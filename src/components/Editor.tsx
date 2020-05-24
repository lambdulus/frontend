import React, { ChangeEvent, KeyboardEvent } from 'react'
import MonacoEditor from 'react-monaco-editor'

import '../styles/Editor.css'

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
  submitOnEnter : boolean
  
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
    submitOnEnter,

    onContent,
    onEnter,
    onExecute,
  } : EditorProperties = props
  const lines : number = content.split('\n').length

  const onChange = (content : string) => {
    // let { target : { value : content } } : { target : { value : string } } = event
    // const caretPosition : number = event.target.selectionEnd

    content = content.replace(/\\/g, 'λ')

    onContent(content, caretPosition)
  }

  // TODO: Editor should not decide that - it should only implement onEnter onShiftEnter onCtrlEnter
  const onKeyDown = (event : KeyboardEvent<HTMLDivElement>) => {
    if ( ! event.shiftKey && ! event.ctrlKey && event.key === 'Enter') {
      
      if (submitOnEnter) {
        event.stopPropagation()
        event.preventDefault()
        onEnter()
      }

      return
    }

    // if (event.shiftKey && event.key === 'Enter' && isMarkDown) {
    //   event.preventDefault()
    //   onEnter()
    // }
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
          // onChange={ onChange }
          onContent={ (content : string) => onChange(content) }
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
  // onChange (event : ChangeEvent<HTMLTextAreaElement>) : void
  onContent (content : string) : void
  onKeyDown (event : KeyboardEvent<HTMLDivElement>) : void
}

function InputField (props : InputProps) : JSX.Element {
  const { placeholder, content, lines, onKeyDown, caretPosition, onContent } : InputProps = props

  return (
    <div
      onKeyDownCapture={ onKeyDown }
    >
      <MonacoEditor
        // width="800"
        height={10 * 19} // 10 lines by default
        language="markdown"
        theme="vs-light"
        value={ content }
        options={ { formatOnPaste : true, minimap : { enabled : false} } }
        onChange={ (content : string) => onContent(content) }
        // editorDidMount={ ::this.editorDidMount }
      />
    </div>
  )
}