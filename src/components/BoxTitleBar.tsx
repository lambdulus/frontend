import React, { MouseEvent } from 'react'
import { BoxType, BoxState } from '../Types'
import UntypedLambdaBTB from '../untyped-lambda-integration/BoxTopBar'
import { UntypedLambdaState } from '../untyped-lambda-integration/Types'

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
  addBoxBefore : (box : BoxState) => void
  addBoxAfter : (box : BoxState) => void
}


export default function BoxTitleBar (props : Props) : JSX.Element {
  const { state, isActive, updateBoxState, removeBox, addBoxBefore, addBoxAfter } : Props = props
  const { type, title, menuOpen, minimized, settingsOpen } = state


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

        <div
          onClick={ (e) => {
            e.stopPropagation()
            updateBoxState({ ...state, minimized : ! minimized })
          } }
          className='box-top-bar--controls--imize'
          title={ minimized ? 'Expand this Box' : 'Collapse this Box' }
        >
          {
            minimized ?
            <i className="mini-icon fas fa-caret-down" />
            :
            <i className="mini-icon fas fa-caret-up" />
          }
        </div>      

        <div
          className='box-top-bar--controls--settings'
          onClick={ (e) => {
            e.stopPropagation()
            updateBoxState({ ...state, settingsOpen : ! settingsOpen })
          } }
        >
          <i className="mini-icon fas fa-cog" />
        </div>

        <div
          onClick={ () => updateBoxState({ ...state, menuOpen : ! menuOpen }) }
          className='box-top-bar--controls--menu'
        >
          <i className="mini-icon fas fa-ellipsis-v"></i>
        </div>
      </div>
      
      {
        menuOpen ?
          <div className='box-top-bar--menu' >
            {/* TODO: move into ... menu */}
            <div
              className='box-top-bar--menu-item'
              onClick={ removeBox }
            >
              Remove
              {/* <i
                className='mini-icon far fa-trash-alt'
                onClick={ removeBox }
                title='Remove this Box'
              /> */}
            </div>

            <div
              className='box-top-bar--menu-item'
              onClick={ () => addBoxAfter }
            >
              New Box Before
            </div>

            <div className='box-top-bar--menu-item'>
              New Box After
            </div>
          
          </div>
        :
        null

      }
      
    </div>
  )

}