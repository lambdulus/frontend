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
  // modalOpen : boolean
  where : BoxPlace | null
  menuOpen : boolean
  shareLinkOpen : boolean
}


export default class BoxTitleBar extends Component<Props, State> {

  constructor (props : Props) {
    super(props)

    this.state = {
      // modalOpen : false,
      where : null,
      menuOpen : false,
      shareLinkOpen : false,
    }

    // this.selectBoxType = this.selectBoxType.bind(this)
  }

  render () : JSX.Element {
    const { state, isActive, updateBoxState, removeBox, addBoxBefore, addBoxAfter } : Props = this.props
    const { type, title, minimized, settingsOpen } = state

    const { where, menuOpen, shareLinkOpen } : State = this.state

    return (
      <div className='boxTopBar'
        onClick={ (e) => e.stopPropagation() }
      >
        {/* {
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
        } */}


        <div
          className='topBarTitle'
        >
          <span
                className='box-top-bar--title-text'
                contentEditable={ true }
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
          {/* {
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
          } */}
        </div>

        {/* <div className='box-top-bar--menu-item--share-link'>
          {
            shareLinkOpen ?
            
            <span>{(() => {
              const searchParams : URLSearchParams = new URL(window.document.location.toString()).searchParams

              searchParams.set('type', state.type)
              searchParams.set('source', encodeURI((state as any).editor.content)) // todo: fix that `as any`
              return window.location.host + '?' + searchParams.toString()})()}
            </span>
              :
            null
          }
        </div> */}

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
                // onClick={ removeBox }
                // title='Remove this Box'
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
            onMouseDownCapture={ e => (e.preventDefault() , e.stopPropagation()) }
            // ^^^ this line is just a dirty quick bug fix
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
                  // updateBoxState(resetMarkdownBox(state as NoteState))
                  break
                }
              }
              this.setState({ menuOpen : false })
            } }
            title='Edit this Expression.'
          >
            <i className="mini-icon far fa-edit"></i>
          </div>

          {/* <div
            onClick={ (e) => {
              e.stopPropagation()
              this.setState({ menuOpen : ! menuOpen })
            } }
            className={ `box-top-bar--controls--menu ${menuOpen ? 'menu-pressed-open' : ''}` }
          >
            <i className="mini-icon fas fa-ellipsis-v"></i>
          </div> */}
        </div>

        {
          null // this is just because I can not comment this whole thing reasonably
          // menuOpen ?
          //   <div
          //     className='box-top-bar--menu'
          //     ref={ (elem : any) => {
          //       // just to be able to always see the menu
          //       if (elem !== null) {
          //         const boundingRect = elem.getBoundingClientRect()
          //         const viewportHeight : number = window.innerHeight
          //         if (boundingRect.bottom > viewportHeight) {
          //           elem.scrollIntoView(false)
          //         }
          //       }
          //     } }
          //   >
          //     {/* TODO: move into ... Menu component */}
          //     <div
          //       className='box-top-bar--menu-item'
          //       onClick={ () => {
          //         this.setState({ shareLinkOpen : true })
          //         const searchParams : URLSearchParams = new URL(window.document.location.toString()).searchParams

          //         searchParams.set('type', state.type)

          //         if (state.type === BoxType.UNTYPED_LAMBDA) {
          //           const macros = encodeURI(JSON.stringify((state as UntypedLambdaState).macrotable))
          //           searchParams.set('source', encodeURI((state as UntypedLambdaState).ast?.toString() || (state as UntypedLambdaState).editor.content))
          //           searchParams.set('macros', macros)
          //         }
          //         else {
          //           searchParams.set('source', encodeURI((state as any).editor.content)) // todo: fix that `as any`
          //         }

          //         if (state.type === BoxType.UNTYPED_LAMBDA) {
          //           searchParams.set('subtype', (state as UntypedLambdaState).subtype)
          //           searchParams.set('strategy', (state as UntypedLambdaState).strategy)
          //           searchParams.set('SDE', (state as UntypedLambdaState).SDE.toString())
          //           searchParams.set('SLI', (state as UntypedLambdaState).SLI.toString())
          //         }

          //         const url : string = window.location.host + '?' + searchParams.toString()

          //         navigator.clipboard.writeText(url)

          //         setTimeout(() => this.setState({ shareLinkOpen : false, menuOpen : false }), 1500)

          //       }}
          //       title='Get shareable link for this Box'
          //     >
          //       Share the URL
          //     </div>
          //     {
          //       shareLinkOpen ?
          //         <p className='box-top-bar--menu-item--notif'>
          //           Link Copied!
          //         </p>
          //         :
          //         null
          //     }
          //     <div
          //       className='box-top-bar--menu-item'
          //       onClick={ removeBox }
          //       title='Delete this Box from the Notebook'
          //     >
          //       Remove
          //       {/* <i
          //         className='mini-icon far fa-trash-alt'
          //         onClick={ removeBox }
          //         title='Remove this Box'
          //       /> */}
          //     </div>

          //     {/* I am commenting the following element out.
          //     I don't want new BOX to be added from the menu from surrounding BOXES.
          //     It just doesn't feel intuitive. */}
          //     {/* <div
          //       className='box-top-bar--menu-item'
          //       title='Add another Box before this one'
          //       onClick={ (e) => {
          //         e.stopPropagation()
          //         this.selectBoxType('before')
          //       } }
          //     >
          //       New Box Before
          //     </div> */}

          //     {/* I am commenting the following element out.
          //     I don't want new BOX to be added from the menu from surrounding BOXES.
          //     It just doesn't feel intuitive. */}
          //     {/* <div
          //       className='box-top-bar--menu-item'
          //       title='Add another Box after this one'
          //       onClick={ (e) => {
          //         e.stopPropagation()
          //         this.selectBoxType('after')
          //       } }
          //     >
          //       New Box After
          //     </div> */}

          //     {/* I am commenting out the following element.
          //         I don't feel like having a REST/EMPTY the BOX option in the menu is necessary.
          //         You can do the same thing by clicking on EDIT and removing everything.
          //         Misclicking on this option also removes your entire work with no going back.
          //         Danger zone! */}
          //     {/* <div
          //       className='box-top-bar--menu-item'
          //       title='Reset this Box to Initial State'
          //       onClick={ (e) => {
          //         e.stopPropagation()
          //         // console.log('CLICKED ON RESET BOX')

          //         switch (type) {
          //           case BoxType.UNTYPED_LAMBDA: {
          //             // console.log('RESET UNTYPED LAMBDA')
          //             updateBoxState(resetUntypedLambdaBox(state as UntypedLambdaState))
          //             break
          //           }
          //           case BoxType.MARKDOWN: {
          //             // console.log('RESET MARODOWN')
          //             updateBoxState(resetMarkdownBox(state as NoteState))
          //             break
          //           }
          //         }
          //         this.setState({ menuOpen : false })
          //       } }
          //     >
          //       Reset this Box
          //     </div> */}

          //     <div
          //       className='box-top-bar--menu-item'
          //       title="Edit this Box's Expression"
          //       onClick={ (e) => {
          //         e.stopPropagation()
          //         // console.log('CLICKED ON RESET BOX')

          //         switch (type) {
          //           case BoxType.UNTYPED_LAMBDA: {
          //             const resetState : UntypedLambdaState = resetUntypedLambdaBox(state as UntypedLambdaState)
          //             const content : string = (state as UntypedLambdaState).expression || (state as UntypedLambdaState).editor.content

          //             updateBoxState({
          //               ...resetState,
          //               editor : {
          //                 ...resetState.editor,
          //                 content, 
          //               }
          //             })
          //             break
          //           }
          //           case BoxType.MARKDOWN: {
          //             // console.log('RESET MARODOWN')
          //             // updateBoxState(resetMarkdownBox(state as NoteState))
          //             break
          //           }
          //         }
          //         this.setState({ menuOpen : false })
          //       } }
          //     >
          //       Edit Expression
          //     </div>
            
          //   </div>
          // :
          // null
        }
        

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


  // selectBoxType (place : BoxPlace) : void {
  //   this.setState({ modalOpen : true, where : place })
  // }

}