import React, { Component, MouseEvent } from 'react'
import { Check, Link2, Maximize2, Minimize2, Pencil, Settings, Trash2 } from 'lucide-react'
import { BoxType, BoxState } from '../Types'
import { UntypedLambdaState } from '../untyped-lambda-integration/Types'

import MarkdownBTB from '../markdown-integration/BoxTopBar'
import { NoteState } from '../markdown-integration/AppTypes'

import EmptyBTB from '../empty-integration/BoxTopBar'

import '../styles/BoxTopBar.css'
import { defaultSettings, resetUntypedLambdaBox, SETTINGS_OPENED_EVENT } from '../untyped-lambda-integration/Constants'


// Shareable links carry the box's local settings as query params, named
// exactly like the settings fields. New params stay optional for the
// parser: years-old links without them fall back to the defaults, so
// course material keeps working. Zen mode is deliberately not shared:
// it is a personal preference, not part of the box.
export function buildBoxShareURL (state : BoxState) : string {
  const searchParams : URLSearchParams = new URL(window.document.location.toString()).searchParams

  searchParams.set('type', state.type)

  if (state.type === BoxType.UNTYPED_LAMBDA) {
    const box : UntypedLambdaState = state as UntypedLambdaState
    const macros = encodeURI(JSON.stringify(box.macrotable))
    searchParams.set('source', encodeURI(box.ast?.toString() || box.editor.content))
    searchParams.set('macros', macros)
  }
  else {
    searchParams.set('source', encodeURI((state as any).editor.content)) // todo: fix that `as any`
  }

  if (state.type === BoxType.UNTYPED_LAMBDA) {
    const box : UntypedLambdaState = state as UntypedLambdaState
    searchParams.set('subtype', box.subtype)
    searchParams.set('strategy', box.strategy)
    searchParams.set('SDE', box.SDE.toString())
    searchParams.set('SLI', box.SLI.toString())
    searchParams.set('ETA', (box.ETA ?? defaultSettings.ETA).toString())
    searchParams.set('expandStandalones', (box.expandStandalones ?? defaultSettings.expandStandalones).toString())
    searchParams.set('collapseOldSteps', (box.collapseOldSteps ?? defaultSettings.collapseOldSteps).toString())
  }

  return window.location.host + '?' + searchParams.toString()
}

type BoxPlace = 'before' | 'after'

interface Props {
  state : BoxState
  isActive : boolean
  isFocused : boolean
  seatBox : () => void
  makeActive : () => void
  removeBox : (e : MouseEvent) => void
  updateBoxState : (box : BoxState) => void
  addBoxBefore : (box : BoxState) => void
  addBoxAfter : (box : BoxState) => void
  hideTitle? : boolean
  titleActionsHost? : React.RefObject<HTMLSpanElement>
}

interface State {
  where : BoxPlace | null
  menuOpen : boolean
  shareLinkOpen : boolean
  compactOpen : boolean
}


export default class BoxTitleBar extends Component<Props, State> {

  private compactPopupRef : React.RefObject<HTMLDivElement>
  private compactToggleRef : React.RefObject<HTMLDivElement>

  constructor (props : Props) {
    super(props)

    this.state = {
      where : null,
      menuOpen : false,
      shareLinkOpen : false,
      compactOpen : false,
    }

    this.compactPopupRef = React.createRef<HTMLDivElement>()
    this.compactToggleRef = React.createRef<HTMLDivElement>()
    this.setCompact = this.setCompact.bind(this)
  }

  componentWillUnmount () : void {
    document.removeEventListener('mousedown', this.onCompactOutside)
  }

  // Compact box menu (see the media query in BoxTopBar.css): tapping
  // the toggle opens, tapping an icon or anywhere else closes.
  setCompact (open : boolean) : void {
    this.setState({ compactOpen : open })

    if (open) {
      document.addEventListener('mousedown', this.onCompactOutside)
    }
    else {
      document.removeEventListener('mousedown', this.onCompactOutside)
    }
  }

  onCompactOutside = (e : Event) : void => {
    const target : EventTarget | null = e.target
    const popup : HTMLDivElement | null = this.compactPopupRef.current
    const toggle : HTMLDivElement | null = this.compactToggleRef.current

    // Taps on the tour card never count as outside: every Next tap
    // would otherwise shut the menu a beat before the step sync
    // re-opens it, flickering through each settings step.
    const inTour : boolean = target instanceof Element && target.closest('.tour') !== null

    if (!inTour && target instanceof Node && popup !== null && !popup.contains(target) && (toggle === null || !toggle.contains(target))) {
      this.setCompact(false)
    }
  }

  render () : JSX.Element {
    const { state, isActive, updateBoxState, removeBox, seatBox, makeActive, hideTitle, titleActionsHost } : Props = this.props
    const { type, title, minimized } = state

    const { shareLinkOpen, compactOpen } : State = this.state

    return (
      <div className='boxTopBar'
        onClick={ (e) => {
          e.stopPropagation()
          // Seating scrolls; activating moves focus (scroll map, shadow)
          // with it. Every control in the bar stops propagation for
          // itself, so only bare-bar clicks land here.
          seatBox()
          makeActive()
        } }
      >
        {
          hideTitle ?
            null
          :
            <div
              className='topBarTitle'
            >
              <span
                    className='box-top-bar--title-text'
                    contentEditable={ ! state.readOnly }
                    suppressContentEditableWarning={true}
                    onClick={ (e) => {
                      // NOTE: this is really ugly and dangerous quick fix
                      // I am trying to fix a bug where for some reason boxes, when clicked into title
                      // it causes focus, then immidiately it loses focus
                      // so now, when I click in the title, I won't make it active at all
                      // (markdown and lambda titles are hidden now, so this guards the remaining ones)
                      e.stopPropagation()
                    } }
                    onBlur={ (e) => updateBoxState({ ...state, title : e.target.textContent || "" })  }
                  >
                  { title }
              </span>
            </div>
        }
        {
          // The macro dock owns its toggle now; the title bar keeps
          // only the portaled Run/Step slot and the right-side box
          // furniture.
          titleActionsHost ?
            <span className='boxTopBar-actions' ref={ titleActionsHost } />
          :
            null
        }
        {
          // With the title gone something else must push the icons
          // right; the portaled actions stay left where the title was.
          hideTitle ?
            <div className='boxTopBar-spacer' />
          :
            null
        }

        {
          // The lambda toggle moved left; only the remaining types
          // keep a right-side custom group (and never an empty one,
          // whose padding and border would leave a footprint).
          type === BoxType.UNTYPED_LAMBDA ?
            null
          :
            <div className='box-top-bar-custom'>
              {
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
        }
        <div
          className={ compactOpen ? 'box-top-bar-controls box-top-bar-controls--open' : 'box-top-bar-controls' }
          ref={ this.compactPopupRef }
          // Capture, so the items' own stopPropagation never swallows
          // it: the menu closes first, the tapped action runs after.
          onClickCapture={ compactOpen ? () => this.setCompact(false) : undefined }
        >
          {
            state.readOnly ?
              null
            :
              <div
                className='box-top-bar--controls-item'
                onClick={ removeBox }
                title='Delete this Box from the Notebook'
              >
                <Trash2 size={ 15 } strokeWidth={ 1.75 } />
              </div>
          }
          {
            type !== BoxType.MARKDOWN ?
            <div
              onClick={ (e) => {
                e.stopPropagation()
                updateBoxState({ ...state, minimized : ! minimized })
              } }
              className='box-top-bar--controls-item box-top-bar--collapse-toggle'
              title={ minimized ? 'Expand this Box' : 'Collapse this Box' }
            >
              {
                minimized ?
                  <Maximize2 size={ 15 } strokeWidth={ 1.75 } />
                :
                  <Minimize2 size={ 15 } strokeWidth={ 1.75 } />
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
                  const opening : boolean = ! state.settingsOpen
                  updateBoxState({ ...state, settingsOpen : ! state.settingsOpen })
                  if (opening) {
                    // Other boxes' panels stand down so they never overlap.
                    // Document, not window: box listeners hang off document
                    // (bubble phase), which a window dispatch never reaches.
                    document.dispatchEvent(new CustomEvent<{ key : string }>(SETTINGS_OPENED_EVENT, { detail : { key : state.__key } }))
                  }
                  // The panel opens (or closes) below the title; re-seat
                  // once it has rendered so it stays in view either way.
                  requestAnimationFrame(() => seatBox())
                }}
              >
                <Settings size={ 15 } strokeWidth={ 1.75 } />
              </div>
            :
            null
          }

          <div
            className='box-top-bar--controls-item'
            onClick={ (e) => {
              e.stopPropagation()
              this.setState({ shareLinkOpen : true })

              navigator.clipboard.writeText(buildBoxShareURL(state))

              setTimeout(() => this.setState({ shareLinkOpen : false, menuOpen : false }), 1500)

            } }
            title='Copy the link to this Expression.'
          >
            <Link2 size={ 15 } strokeWidth={ 1.75 } />
          </div>

          {
            state.readOnly ?
              null
            :
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
                <Pencil size={ 15 } strokeWidth={ 1.75 } />
              </div>
          }
        </div>

        { /* Compact box menu toggle: only the media query in
             BoxTopBar.css ever shows it (below 420px), where the
             controls above fold into its popup. */ }
        <div
          ref={ this.compactToggleRef }
          className={ compactOpen ? 'box-top-bar--controls-item box-top-bar--compact-toggle box-top-bar--compact-toggle--open' : 'box-top-bar--controls-item box-top-bar--compact-toggle' }
          title={ compactOpen ? 'Close box actions' : 'Open box actions' }
          onClick={ (e) => {
            e.stopPropagation()
            this.setCompact(! compactOpen)
          } }
        >
          <span className='box-top-bar--compact-bar' aria-hidden='true' />
          <span className='box-top-bar--compact-bar' aria-hidden='true' />
          <span className='box-top-bar--compact-bar' aria-hidden='true' />
        </div>

        {
          shareLinkOpen ?
            <p className='box-top-bar--menu-item--notif'>
              <Check size={ 14 } strokeWidth={ 2 } />
              Link copied!
            </p>
            :
            null
        }

      </div>
      )
    }

}