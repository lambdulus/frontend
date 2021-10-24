import React from 'react'

import 'github-markdown-css/github-markdown-light.css'
import { NoteState } from './AppTypes'
import Editor from '../components/Editor'

import './styles/Note.css'

const ReactMarkdown = require('react-markdown')

export interface NoteProperties {
  state : NoteState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : NoteState) : void
}

export default function Note (props : NoteProperties) : JSX.Element {
  const {
    state : {
      note,
      editor : { placeholder, content, syntaxError },
      isEditing,
    },
    isActive,
    setBoxState,
  } = props
  
  const onContent = (content : string) => {
    setBoxState({
      ...props.state,
      note : content,
      editor : {
        ...props.state.editor,
        content,
        syntaxError : null,
      }
    })
    // this.updateURL(expression) // tohle musim nejak vyresit - mozna ta metoda setBoxState v APP bude checkovat propisovat do URL
  }

    if (isEditing) { // TODO: isFocused removed just for now
    return (
      <div className='box boxNoteEditor'>
        <Editor
          placeholder={ placeholder } // data
          content={ content } // data
          syntaxError={ syntaxError } // data
          submitOnEnter={ false } // data
          shouldReplaceLambda={ false }
          
          onContent={ onContent } // fn
          onEnter={ () => void 0 } // fn
          onCtrlEnter={ () => void 0 }
          onShiftEnter={ () => void 0 }
          onExecute={ () => {} } // fn
          // onReset={ this.onClear } // fn not yet
        />
      </div>
    )
  }


  return (
    <div
      className='box boxNote'
      onClick={ () => 
        isActive &&
        setBoxState({
        ...props.state,
        isEditing : true,
      }) }
    >
      <ReactMarkdown className='markdown-body' source={ note } />
    </div>
  )
}