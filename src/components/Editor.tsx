import React, { KeyboardEvent } from 'react'
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
  syntaxError : Error | null
  submitOnEnter : boolean
  shouldReplaceLambda : boolean
  
  onContent (content : string) : void
  onShiftEnter () : void
  onCtrlEnter () : void
  onEnter () : void
  onExecute () : void // TODO:delete
  // onReset () : void
}

export default function Editor (props : EditorProperties) : JSX.Element {
  const {
    placeholder,
    content,
    syntaxError,
    submitOnEnter,
    shouldReplaceLambda,

    onContent,
    onEnter,
    onShiftEnter,
    onCtrlEnter,
    // onExecute,
  } : EditorProperties = props

  const onChange = (content : string) => {
    // let { target : { value : content } } : { target : { value : string } } = event
    // const caretPosition : number = event.target.selectionEnd

    if (shouldReplaceLambda) {
      content = content.replace(/\\/g, 'λ')
    }
    
    onContent(content)
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

    if (event.shiftKey && event.key === 'Enter') {
      event.preventDefault()
      onShiftEnter()
    }
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault()
      onCtrlEnter()
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
  // onChange (event : ChangeEvent<HTMLTextAreaElement>) : void
  onContent (content : string) : void
  onKeyDown (event : KeyboardEvent<HTMLDivElement>) : void
}

function InputField (props : InputProps) : JSX.Element {
  const { content, onKeyDown, onContent } : InputProps = props
  const lines : number = content.split('\n').length


  return (
    <div
      onKeyDownCapture={ onKeyDown }
    >
      <MonacoEditor
        // width="800"
        height={ Math.max(5 * 19 ,Math.min(40 * 19, (lines + 1) * 19)) } // 10 lines by default
        language="markdown"
        theme="vs-light"
        value={ content }
        options={ {
          formatOnPaste : true,
          minimap : { enabled : false },
          renderLineHighlight : "none",
          scrollBeyondLastLine : false,
          overviewRulerBorder : false,
          scrollbar : {
            // handleMouseWheel : false,
          } } }
        onChange={ (content : string) => onContent(content) }
        // editorDidMount={ ::this.editorDidMount }
        editorDidMount={ (editor, monaco) => editor.focus() }
      />
    </div>
  )
}