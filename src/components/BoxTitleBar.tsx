import React, { Component, MouseEvent } from 'react'
import { BoxType, BoxState, GlobalSettings, BoxesWhitelist } from '../Types'
import UntypedLambdaBTB from '../untyped-lambda-integration/BoxTopBar'
import { UntypedLambdaState } from '../untyped-lambda-integration/Types'

import MarkdownBTB from '../markdown-integration/BoxTopBar'
import { NoteState } from '../markdown-integration/AppTypes'

import EmptyBTB from '../empty-integration/BoxTopBar'

import '../styles/BoxTopBar.css'
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
  where : BoxPlace | null
  menuOpen : boolean
  shareLinkOpen : boolean
}


export default class BoxTitleBar extends Component<Props, State> {

  constructor (props : Props) {
    super(props)

    this.state = {
      where : null,
      menuOpen : false,
      shareLinkOpen : false,
    }
  }

  render () : JSX.Element {
    const { state, isActive, updateBoxState, removeBox } : Props = this.props
    const { type, title, minimized } = state

    const { shareLinkOpen } : State = this.state

    return (
      <div className='boxTopBar'
        onClick={ (e) => e.stopPropagation() }
      >
        <div
          className='topBarTitle'
        >
          <span
                className='box-top-bar--title-text'
                contentEditable={ true }
                suppressContentEditableWarning={true}
                onClick={ (e) => {
                  // NOTE: this is really ugly and dangerous quick fix
                  // I am trying to fix a bug where for some reason markdown boxes, when clicked into title
                  // it causes focus, then immidiately it loses focus
                  // so now, when I click in the title, I won't make it active at all
                  e.stopPropagation()
                } }
                onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" })  }
              >
              { title }
          </span>
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
              className='box-top-bar--controls-item'
              onClick={ removeBox }
              title='Delete this Box from the Notebook'
            >
              <i
                className='mini-icon far fa-trash-alt'
              />
            </div>
          
          {
            type !== BoxType.MARKDOWN ?
            <div
              onClick={ (e) => {
                e.stopPropagation()
                updateBoxState({ ...state, minimized : ! minimized })
              } }
              className='box-top-bar--controls-item'
              title={ minimized ? 'Expand this Box' : 'Collapse this Box' }
            >
              {
                minimized ?
                  <i className="mini-icon fas fa-expand" />
                :
                  <i className="mini-icon fas fa-compress" />
              }
            </div>
            :
              null
          }

          {
            type !== BoxType.MARKDOWN ?
              <div
                className='box-top-bar--controls-item'
                title="Open this Boxs' settings"
                onClick={ (e) => {
                  e.stopPropagation()
                  updateBoxState({ ...state, settingsOpen : ! state.settingsOpen })
                }}
              >
                <i className="mini-icon fas fa-cogs"/>
              </div>
            :
            null
          }

          <div
            className='box-top-bar--controls-item'
            onClick={ (e) => {
              e.stopPropagation()
              this.setState({ shareLinkOpen : true })
              const searchParams : URLSearchParams = new URL(window.document.location.toString()).searchParams

              searchParams.set('type', state.type)

              if (state.type === BoxType.UNTYPED_LAMBDA) {
                const macros = encodeURI(JSON.stringify((state as UntypedLambdaState).macrotable))
                searchParams.set('source', encodeURI((state as UntypedLambdaState).ast?.toString() || (state as UntypedLambdaState).editor.content))
                searchParams.set('macros', macros)
              }
              else {
                searchParams.set('source', encodeURI((state as any).editor.content)) // todo: fix that `as any`
              }

              if (state.type === BoxType.UNTYPED_LAMBDA) {
                searchParams.set('subtype', (state as UntypedLambdaState).subtype)
                searchParams.set('strategy', (state as UntypedLambdaState).strategy)
                searchParams.set('SDE', (state as UntypedLambdaState).SDE.toString())
                searchParams.set('SLI', (state as UntypedLambdaState).SLI.toString())
              }

              const url : string = window.location.host + '?' + searchParams.toString()

              navigator.clipboard.writeText(url)

              setTimeout(() => this.setState({ shareLinkOpen : false, menuOpen : false }), 1500)

            } }
            title='Copy the link to this Expression.'
          >
            <i className="mini-icon fas fa-share-alt-square"></i>
          </div>

          <div
            className='box-top-bar--controls-item'
            onMouseDownCapture={ e => {
              e.preventDefault()
              e.stopPropagation()
            } }
            // ^^^ this function is just a dirty quick bug fix
            // when you are editing and click on the edit button again
            // on the mouse down - the box loses focus and then on mouse up
            // the onClick is finished and it is then again focused
            // so the result looks awkward
            // the previous line is a black hole for the mousedown event
            // that way it can't cause losing focus for the box, because it is stoped
            onClick={ (e) => {
              console.log('clicked on the EDIT button')
              e.stopPropagation()

              switch (type) {
                case BoxType.UNTYPED_LAMBDA: {
                  const resetState : UntypedLambdaState = resetUntypedLambdaBox(state as UntypedLambdaState)
                  const content : string = (state as UntypedLambdaState).expression || (state as UntypedLambdaState).editor.content

                  updateBoxState({
                    ...resetState,
                    editor : {
                      ...resetState.editor,
                      content, 
                    }
                  })
                  break
                }
                case BoxType.MARKDOWN: {
                  updateBoxState({ ...state, isEditing : true })
                  break
                }
              }
              this.setState({ menuOpen : false })
            } }
            title='Edit this Expression.'
          >
            <i className="mini-icon far fa-edit"></i>
          </div>
        </div>

        {
          shareLinkOpen ?
            <p className='box-top-bar--menu-item--notif'>
              Link Copied!
            </p>
            :
            null
        }

      </div>
      )
    }

}