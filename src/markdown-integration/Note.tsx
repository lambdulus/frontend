import React from 'react'

import 'github-markdown-css'
import { NoteState } from './AppTypes'
import Editor from '../components/Editor'
const ReactMarkdown = require('react-markdown')

export interface NoteProperties {
  state : NoteState
  isActive : boolean

  setBoxState (state : NoteState) : void
  // addBox (boxState : BoxState) : void
}

export default function Note (props : NoteProperties) : JSX.Element {
  const {
    state : {
      note,
      editor : { placeholder, content, caretPosition, syntaxError },
      isEditing,
    },
    isActive,
    setBoxState,
  } = props
  
  // const makeActive = useContext(MakeActiveContext)
  // const setBoxState = useContext(SetBoxContext)
  // const deleteBox = useContext(DeleteBox)

  const onContent = (content : string, caretPosition : number) => {
    setBoxState({
      ...props.state,
      editor : {
        ...props.state.editor,
        content,
        caretPosition,
        syntaxError : null,
      }
    })
    // this.updateURL(expression) // tohle musim nejak vyresit - mozna ta metoda setBoxState v APP bude checkovat propisovat do URL
  }

  const onSubmitNote = () => {
    setBoxState({
      ...props.state,
      note : content,
      isEditing : false,
    })
  }


  if (isEditing && isActive) {
    return (
      <div className='box boxNoteEditor'>
        {
          note === '' ? 
            <p className='emptyStep'>Empty note box.</p>
          :
            null
        }    
        <div id="controls">
          <button onClick={ () => onSubmitNote() }>
            Save
          </button>
        </div>
        <Editor
          placeholder={ placeholder } // data
          content={ content } // data
          caretPosition={ caretPosition } // data
          syntaxError={ syntaxError } // data
          isMarkDown={ true } // data
          
          onContent={ onContent } // fn
          onEnter={ onSubmitNote } // fn
          onExecute={ () => {} } // fn
          // onReset={ this.onClear } // fn not yet
        />
      </div>
    )
  }


  return (
    <div className='box boxNote'>
        <div id="controls">
          <button onClick={
            () => void 0
            // () => {
            // setBoxState({
            //   ...props.state,
            //   isEditing : true,
            // })
            // makeActive()            
          // }
          }
            
          >
            Edit
          </button>
        </div>
        {/* <i className='removeBox far fa-trash-alt' onClick={ deleteBox } title='Remove this Box' /> */}
      <ReactMarkdown className='markdown-body' source={ note } />
    </div>
  )
}