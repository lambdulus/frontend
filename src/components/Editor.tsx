import React, { KeyboardEvent } from 'react'
import MonacoEditor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

import { Theme, ThemeContext } from '../contexts/Theme'

// Bundle monaco locally instead of loading it from a CDN.
loader.config({ monaco })

// Match the box surface so the editor does not stand out as a lighter patch.
// Keep in sync with --surface in index.css.
monaco.editor.defineTheme('lambdulus-dark', {
  base : 'vs-dark',
  inherit : true,
  rules : [],
  colors : {
    'editor.background' : '#151c20',
  },
})

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
  } : EditorProperties = props

  const onChange = (content : string) => {
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
          shouldReplaceLambda={ shouldReplaceLambda }
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
  shouldReplaceLambda : boolean
  onContent (content : string) : void
  onKeyDown (event : KeyboardEvent<HTMLDivElement>) : void
}

function InputField (props : InputProps) : JSX.Element {
  const { content, shouldReplaceLambda, onKeyDown, onContent } : InputProps = props
  const lines : number = content.split('\n').length

  const editorRef = React.useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  const handleMount = (editor : monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor
    editor.focus()
  }

  // Replace `\` with `λ` as a monaco edit so the cursor stays put.
  // Routing it through the controlled `value` round-trip instead resets
  // the caret to the end of the content.
  const handleChange = (next : string | undefined) => {
    const editor = editorRef.current
    const value = next ?? ''

    if (shouldReplaceLambda && value.includes('\\') && editor !== null) {
      const model = editor.getModel()

      if (model !== null) {
        const position = editor.getPosition()
        const edits = model.findMatches('\\', false, false, false, null, false)
          .map((match) => ({ range : match.range, text : 'λ' }))

        if (edits.length > 0) {
          editor.executeEdits('lambda-replace', edits)

          if (position !== null) {
            editor.setPosition(position)
          }

          return // the model change re-fires onChange with clean text
        }
      }
    }

    onContent(value)
  }

  return (
    <div
      onKeyDownCapture={ onKeyDown }
    >
      <ThemeContext.Consumer>
        { (theme : Theme) =>
            <MonacoEditor
              height={ Math.max(5 * 19 ,Math.min(40 * 19, (lines + 1) * 19)) } // 10 lines by default
              language="markdown"
              theme= { theme === Theme.Dark ? 'lambdulus-dark' : 'vs-light' }
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
              onChange={ handleChange }
              onMount={ handleMount }
            />
        }

      </ThemeContext.Consumer>
    </div>
  )
}