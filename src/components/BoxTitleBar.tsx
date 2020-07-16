import React, { Component, MouseEvent } from 'react'
import { BoxType, BoxState, GlobalSettings, BoxesWhitelist } from '../Types'
import UntypedLambdaBTB from '../untyped-lambda-integration/BoxTopBar'
import { UntypedLambdaState } from '../untyped-lambda-integration/Types'

import MarkdownBTB from '../markdown-integration/BoxTopBar'
import { NoteState, resetMarkdownBox } from '../markdown-integration/AppTypes'

import EmptyBTB from '../empty-integration/BoxTopBar'

import '../styles/BoxTopBar.css'
import PickBoxTypeModal from './PickBoxTypeModal'
import { resetUntypedLambdaBox } from '../untyped-lambda-integration/AppTypes'


type BoxPlace = 'before' | 'after'

interface Props {
  state : BoxState
  isActive : boolean
  isFocused : boolean
  removeBox : (e : MouseEvent) => void
  updateBoxState : (box : BoxState) => void
  addBoxBefore : (box : BoxState) => void
  addBoxAfter : (box : BoxState) => void
  settings : GlobalSettings
  whiteList : BoxesWhitelist
}

interface State {
  modalOpen : boolean
  where : BoxPlace | null
  menuOpen : boolean
}


export default class BoxTitleBar extends Component<Props, State> {

  constructor (props : Props) {
    super(props)

    this.state = {
      modalOpen : false,
      where : null,
      menuOpen : false,
    }

    this.selectBoxType = this.selectBoxType.bind(this)
  }

  render () : JSX.Element {
    const { state, isActive, updateBoxState, removeBox, addBoxBefore, addBoxAfter } : Props = this.props
    const { type, title, minimized, settingsOpen } = state

    const { modalOpen, where, menuOpen } : State = this.state

    return (
      <div className='boxTopBar'>
        {
          modalOpen ?
            <PickBoxTypeModal
              addNew={ (box : BoxState) => {
                if (where === 'before') {
                  this.props.addBoxBefore(box)
                }
                else {
                  this.props.addBoxAfter(box)
                }
                this.setState({ modalOpen : false, where : null, menuOpen : false })
              } }
              whiteList={ this.props.whiteList }
              settings={ this.props.settings }
            />
          :
            null
        }


        <div
          className='topBarTitle'
        >
          {
            type !== BoxType.MARKDOWN ?
              <span
                className='box-top-bar--title-text'
                contentEditable={ true }
                onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" })  }
              >
                { title }
              </span>
            :
              null
          }
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
          {
            type !== BoxType.MARKDOWN ?
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
            :
              null
          }

          {/* <div
            className='box-top-bar--controls--settings'
            onClick={ (e) => {
              e.stopPropagation()
              updateBoxState({ ...state, settingsOpen : ! settingsOpen })
            } }
          >
            <i className="mini-icon fas fa-cog" />
          </div> */}

          <div
            onClick={ (e) => {
              e.stopPropagation()
              this.setState({ menuOpen : ! menuOpen })
            } }
            className={ `box-top-bar--controls--menu ${menuOpen ? 'menu-pressed-open' : ''}` }
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
                title='Delete this Box from the Notebook'
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
                title='Add another Box before this one'
                onClick={ (e) => {
                  e.stopPropagation()
                  this.selectBoxType('before')
                } }
              >
                New Box Before
              </div>

              <div
                className='box-top-bar--menu-item'
                title='Add another Box after this one'
                onClick={ (e) => {
                  e.stopPropagation()
                  this.selectBoxType('after')
                } }
              >
                New Box After
              </div>

              <div
                className='box-top-bar--menu-item'
                title='Reset this Box to Initial State'
                onClick={ (e) => {
                  e.stopPropagation()
                  console.log('CLICKED ON RESET BOX')

                  switch (type) {
                    case BoxType.UNTYPED_LAMBDA: {
                      console.log('RESET UNTYPED LAMBDA')
                      updateBoxState(resetUntypedLambdaBox(state as UntypedLambdaState))
                      break
                    }
                    case BoxType.MARKDOWN: {
                      console.log('RESET MARODOWN')
                      updateBoxState(resetMarkdownBox(state as NoteState))
                      break
                    }
                  }
                  this.setState({ menuOpen : false })
                } }
              >
                Reset this Box
              </div>
            
            </div>
          :
          null

        }
        
      </div>
      )
    }


  selectBoxType (place : BoxPlace) : void {
    this.setState({ modalOpen : true, where : place })
  }

}