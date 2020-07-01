import React, { MouseEvent } from 'react'
import { BoxType, BoxState } from '../Types'
import UntypedLambdaBTB from '../untyped-lambda-integration/BoxTopBar'
import { UntypedLambdaState } from '../untyped-lambda-integration/AppTypes'

import MarkdownBTB from '../markdown-integration/BoxTopBar'
import { NoteState } from '../markdown-integration/AppTypes'

import EmptyBTB from '../empty-integration/BoxTopBar'

import '../styles/BoxTopBar.css'

interface Props {
  state : BoxState
  isActive : boolean
  isFocused : boolean
  removeBox : (e : MouseEvent) => void
  updateBoxState : (box : BoxState) => void
}


// TODO:
// refactor/rewrite
// This component needs to have the most control over the Box Title Bar
// only the parts of it will come from the Integrations

export default function BoxTitleBar (props : Props) : JSX.Element {
  const { state, isActive, updateBoxState, removeBox } : Props = props
  const { type, title } = state


  return (
    <div className='boxTopBar'>
      <div
        className='topBarTitle'
        contentEditable={ true }
        onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" }) 
      } >
        { title }
      </div>

      <div className='box-top-bar-custom'>
        {
          (type === BoxType.UNTYPED_LAMBDA) ? 
            (
              <UntypedLambdaBTB
                state={ state as UntypedLambdaState }
                isActive={ isActive }
                removeBox={ removeBox }
                updateBoxState={ updateBoxState }
              />
            )
          :
          (type === BoxType.MARKDOWN) ?
            (
              <MarkdownBTB
                state={ state as NoteState }
                isActive={ isActive }
                removeBox={ removeBox }
                updateBoxState={ updateBoxState }
              />
            )
          :
            (
              <EmptyBTB />
            )
        }


      </div>
      <div className='box-top-bar-controls'>
      

        <div className='box-top-bar--controls--settings'>
          <i className="mini-icon fas fa-cog" />
        </div>

        {/* TODO: move into ... menu */}
        <div className='box-top-bar--controls--remove'>
          <i
            className='mini-icon far fa-trash-alt'
            onClick={ removeBox }
            title='Remove this Box'
          />
        </div>

        <div className='box-top-bar--controls--menu'>
          <i className="mini-icon fas fa-ellipsis-v"></i>
        </div>

        

        {/* {
          state.minimized ?
            <i
              className="imizeBox fas fa-sort-down"
              onClick={ (e : MouseEvent) => {
                e.stopPropagation()
                updateBoxState({ ...state, minimized : false })
              } }
              title='Expand this Box'
            />
            :
            <i
              className="imizeBox fas fa-sort-up"
              onClick={ (e : MouseEvent) => {
                e.stopPropagation()
                updateBoxState({ ...state, minimized : true })
              } }
              title='Collapse this Box'
            />
        } */}
      </div>
      
      
    </div>
  )

}