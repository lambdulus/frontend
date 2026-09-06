import React, { PureComponent } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import CreateBox from '../components/CreateBox'
import { BoxType, NotebookState, BoxState } from '../Types'
import { UntypedLambdaState } from '../untyped-lambda-integration/Types'

import { onMarkDownBlur, NoteState, onMarkDownActive } from '../markdown-integration/AppTypes'
import { BoxContainer } from '../components/BoxContainer'

interface Props {
  state : NotebookState

  updateNotebook (notebook : Partial<NotebookState>) : void
}

// The prime line is the vertical center of the view: the last box (in
// order) whose top bar sits above it owns the side arrows, whether it
// got there by click or by plain scrolling. Centering the rule makes
// both directions symmetric: scrolling up keeps the lower box until
// the one above truly takes over the view, and scrolling down hands
// over as soon as the next box fills the lower half.
export interface BoxTop {
  top : number
  height : number
}

// The last box (in order) reaching down past the line; hidden boxes
// report no height and never win; with nothing past the line the
// first box stays prime.
export function selectPrimeBox (boxes : Array<BoxTop>, line : number) : number {
  let prime : number = 0
  boxes.forEach((box : BoxTop, i : number) => {
    if (box.height > 0 && box.top <= line) {
      prime = i
    }
  })
  return prime
}

// One zen page in the given direction, or null past either end: zen
// never wraps around.
export function zenStep (anchor : number, length : number, direction : 1 | -1) : number | null {
  const next : number = anchor + direction
  if (next < 0 || next >= length) {
    return null
  }
  return next
}

// One line on the zen map: box titles are gone, so a lambda box shows
// its initial term and a note shows its title, each with a fallback.
export function zenBoxLabel (box : BoxState) : string {
  if (box.type === BoxType.UNTYPED_LAMBDA) {
    const history = (box as UntypedLambdaState).history
    if (history.length > 0) {
      return history[0].ast.toString()
    }
  }
  if (box.type === BoxType.MARKDOWN) {
    const title : string = String((box as NoteState).title ?? '')
    return title.trim() !== '' ? title : 'Note'
  }
  const title : string = String(box.title ?? '')
  return title.trim() !== '' ? title : 'Empty expression'
}

interface State {
  mapAtTop : boolean
  mapAtBottom : boolean
}

export default class Notebook extends PureComponent<Props, State> {
  private boxRefs : Array<HTMLLIElement | null>
  private spacerRef : React.RefObject<HTMLDivElement>
  private mapListRef : React.RefObject<HTMLDivElement>
  private seatRequested : number | null
  private primeRaf : number | null

  constructor (props : Props) {
    super(props)

    this.boxRefs = []
    this.spacerRef = React.createRef<HTMLDivElement>()
    this.mapListRef = React.createRef<HTMLDivElement>()
    this.seatRequested = null
    this.primeRaf = null
    this.state = { mapAtTop : true, mapAtBottom : true }

    this.insertBefore = this.insertBefore.bind(this)
    this.insertAfter = this.insertAfter.bind(this)
    this.removeBox = this.removeBox.bind(this)
    this.updateBoxState = this.updateBoxState.bind(this)
    this.makeActive = this.makeActive.bind(this)
    this.onBlur = this.onBlur.bind(this)
    this.onPageKeyDown = this.onPageKeyDown.bind(this)
    this.onPageScroll = this.onPageScroll.bind(this)
  }

  componentDidMount () : void {
    window.addEventListener('keydown', this.onPageKeyDown)
    window.addEventListener('scroll', this.onPageScroll, { passive : true })
    this.syncBodyZen()
    this.syncMapEdges()
  }

  // The map fades only at the ends scrolled away from, mirroring the
  // history gap marks. Guarded so it only re-renders on flips.
  syncMapEdges (el : HTMLDivElement | null = null) : void {
    const target : HTMLDivElement | null = el ?? this.mapListRef.current
    if (target === null) {
      return
    }
    const atBottom : boolean = target.scrollHeight - target.scrollTop - target.clientHeight < 24
    const atTop : boolean = target.scrollTop <= 4
    if (atBottom !== this.state.mapAtBottom || atTop !== this.state.mapAtTop) {
      this.setState({ mapAtBottom : atBottom, mapAtTop : atTop })
    }
  }

  componentWillUnmount () : void {
    window.removeEventListener('keydown', this.onPageKeyDown)
    window.removeEventListener('scroll', this.onPageScroll)
    if (this.primeRaf !== null) {
      window.cancelAnimationFrame(this.primeRaf)
    }
    document.body.classList.remove('zen')
  }

  // In zen the page itself must never move: only the history pane
  // scrolls. The page scroller lives outside the notebook tree, so
  // the lock goes on the body and follows the mode on every update.
  syncBodyZen () : void {
    if (this.props.state.zenMode === true) {
      document.body.classList.add('zen')
    }
    else {
      document.body.classList.remove('zen')
    }
  }

  // Zen paging by key: ArrowUp/ArrowDown turn the page, unless the
  // keystroke belongs to someone else - an editor, or the history
  // pane, which scrolls itself with the arrows while a step inside
  // it holds focus.
  onPageKeyDown (e : KeyboardEvent) : void {
    const { boxList, activeBoxIndex, focusedBoxIndex, zenMode } = this.props.state
    if (zenMode !== true || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) {
      return
    }

    const focused : Element | null = document.activeElement
    if (focused !== null) {
      if (focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement || focused instanceof HTMLSelectElement) {
        return
      }
      if (focused instanceof HTMLElement && focused.isContentEditable) {
        return
      }
      if (focused.closest('.box-history-scroll') !== null) {
        return
      }
    }

    const next : number | null = zenStep(focusedBoxIndex ?? activeBoxIndex, boxList.length, e.key === 'ArrowDown' ? 1 : -1)
    // In zen the arrows belong to paging (and to the history pane and
    // the editors, handled above): never let them nudge the page
    // itself, not even past the first or last box.
    e.preventDefault()
    if (next !== null) {
      this.makeActive(next)
    }
  }

  // Plain scrolling moves the prime view, so the side arrows follow
  // it: whichever box straddles the prime line becomes their anchor.
  // Throttled to one measure per frame, and only ever re-renders on
  // an actual anchor change.
  onPageScroll () : void {
    if (this.primeRaf !== null) {
      return
    }
    this.primeRaf = window.requestAnimationFrame(() => {
      this.primeRaf = null
      this.syncAnchorToPrime()
    })
  }

  syncAnchorToPrime () : void {
    const { boxList, focusedBoxIndex, activeBoxIndex, zenMode } = this.props.state
    if (zenMode === true || boxList.length === 0) {
      return
    }
    const tops : Array<BoxTop> = boxList.map((_, i : number) => {
      const el : HTMLLIElement | null | undefined = this.boxRefs[i]
      if (el === null || el === undefined) {
        return { top : Number.POSITIVE_INFINITY, height : 0 }
      }
      const rect : DOMRect = el.getBoundingClientRect()
      return { top : rect.top, height : rect.height }
    })
    const prime : number = selectPrimeBox(tops, window.innerHeight / 2)
    if (prime !== (focusedBoxIndex ?? activeBoxIndex)) {
      this.props.updateNotebook({ focusedBoxIndex : prime })
    }
  }

  render () {
    const { state } = this.props
    const { activeBoxIndex, focusedBoxIndex, boxList, name, locked, zenMode } = state

    // Box-to-box navigator anchor: the focused box when there is one,
    // otherwise the active one. Plain scrolling keeps the focus on
    // the prime box, so the arrows always continue from where the
    // view is, not from the last click.
    const anchor : number = focusedBoxIndex ?? activeBoxIndex
    const hasPrev : boolean = anchor > 0
    const hasNext : boolean = anchor < boxList.length - 1

    // Zen mode shows a single box at a time: the anchor owns the
    // viewport, everything else (including the add-box affordances)
    // steps out via CSS.
    const zen : boolean = zenMode === true

    return (
      <div className={ zen ? 'mainSpace zen' : 'mainSpace' }>
        <h1 className="notebook-title">
          <span
            contentEditable={ ! locked }
            suppressContentEditableWarning={ true }
            spellCheck={ false }
            title={ locked ? name : 'Click to rename this notebook' }
            onKeyDown={ (e) => {
              // Enter commits the name instead of inserting a newline.
              if (e.key === 'Enter') {
                e.preventDefault()
                e.currentTarget.blur()
              }
            } }
            onBlur={ (e) => {
              if (locked) {
                return
              }

              const next : string = e.currentTarget.textContent?.trim() || ''
              if (next.length === 0) {
                // An empty heading would leave nothing to click on, and
                // React will not repair edited content on its own.
                e.currentTarget.textContent = name
              }
              else if (next !== name) {
                this.props.updateNotebook({ name : next })
              }
            } }
          >
            { name }
          </span>
        </h1>
        {/* TODO: This will be refactored out to standalone component. */}
        <ul className="boxList UL">
          { boxList.map(
            (box : BoxState, i : number) =>
            <li
              className={ zen && i === anchor ? 'LI zen-current' : 'LI' }
              key={ box.__key }
              ref={ (el : HTMLLIElement | null) => { this.boxRefs[i] = el } }
            >

              <BoxContainer
                box={ box}
                isActiveBox={ activeBoxIndex === i}
                isFocusedBox={ focusedBoxIndex === i }
                seatBox={ () => this.ensureFocusRoom(i) }
                addBoxBefore={ (box : BoxState) => this.insertBefore(i, box) }
                addBoxAfter={ (box : BoxState) => this.insertAfter(i, box) }
                makeActive={ () => this.makeActive(i) }
                removeBox={ () => this.removeBox(i) }
                updateBoxState={ (box : BoxState) => this.updateBoxState(i, box) }
                onBlur={ () => this.onBlur(i) }
              />
            </li>
          ) }

          {
            boxList.length === 0 ?
              <div className='top-level--create-box'>
                <p className='empty-notebook-hint'>An empty notebook. Add your first box below.</p>
                <CreateBox
                  addNew={ (box : BoxState) => this.insertBefore(state.boxList.length, box) }
                />
              </div>
            :
            null
          }
        </ul>
        <div className='notebook-bottom-spacer' ref={ this.spacerRef } />
        {
          // Zen map: one line per box (initial terms, titles gone),
          // vertically centered, capped at 70% of the view, scrolling
          // under fades past that. Clicking a line jumps straight to
          // its box; the anchor carries the accent bar.
          zen && boxList.length > 0 ?
            <nav className='zen-map' aria-label='Boxes in this notebook'>
              <div
                className={ `zen-map-list${ this.state.mapAtTop ? '' : ' mask-top' }${ this.state.mapAtBottom ? '' : ' mask-bottom' }` }
                ref={ this.mapListRef }
                onScroll={ (e) => this.syncMapEdges(e.currentTarget) }
              >
                {
                  boxList.map((box : BoxState, i : number) => (
                    <button
                      key={ box.__key }
                      className={ `zen-map-item${ i === anchor ? ' zen-map-item--current' : '' }` }
                      title={ zenBoxLabel(box) }
                      onClick={ () => this.makeActive(i) }
                    >
                      <span className='zen-map-label'>{ zenBoxLabel(box) }</span>
                    </button>
                  ))
                }
              </div>
            </nav>
          :
            null
        }
        {
          // Fixed box-to-box navigator: jumps to the previous/next box
          // and focuses it (seating included). Hidden for an empty
          // notebook; each arrow enables only while a box exists
          // in its direction.
          boxList.length === 0 ?
            null
          :
            <div className='box-nav' aria-label='Box navigation'>
              <button
                className='box-nav--btn'
                title='Previous box'
                aria-label='Previous box'
                disabled={ ! hasPrev }
                onClick={ () => this.makeActive(anchor - 1) }
              >
                <ChevronUp size={ 22 } strokeWidth={ 2 } />
              </button>
              <button
                className='box-nav--btn'
                title='Next box'
                aria-label='Next box'
                disabled={ ! hasNext }
                onClick={ () => this.makeActive(anchor + 1) }
              >
                <ChevronDown size={ 22 } strokeWidth={ 2 } />
              </button>
            </div>
        }
      </div>
    )
  }

  insertBefore (index : number, box : BoxState) : void {
    const { boxList } = this.props.state

    const boxListCopy = [ ...boxList ]

    boxListCopy.splice(index, 0, box)

    this.props.updateNotebook({ boxList : boxListCopy, activeBoxIndex : index, focusedBoxIndex : index })
  }

  insertAfter (index : number, box : BoxState) : void {

    const { boxList } = this.props.state

    boxList.splice(index + 1, 0, box)
    this.props.updateNotebook({ boxList : boxList, activeBoxIndex : index + 1, focusedBoxIndex : index + 1})
  }

  removeBox (index : number) : void {
    const { boxList, activeBoxIndex } = this.props.state
    
    const nearestValidIndex = (i : number) => {
      if (i < activeBoxIndex) return activeBoxIndex - 1
      if (i > activeBoxIndex) return activeBoxIndex
      if (boxList.length === 1) return NaN
      if (i === 0) return i
      return i - 1
    }

    const newIndex : number = nearestValidIndex(index)

    boxList.splice(index, 1)
    this.props.updateNotebook({ boxList : boxList, activeBoxIndex : newIndex })
  }

  updateBoxState (index : number, box : BoxState) : void {
    const { boxList } = this.props.state
    boxList[index] = { ...box }


    this.props.updateNotebook({ boxList : [...boxList], activeBoxIndex : index })
  }

  makeActive (index : number) : void {
    const { activeBoxIndex, focusedBoxIndex, boxList } = this.props.state

    const currentType : BoxType = boxList[activeBoxIndex].type

    switch (currentType) {
      case BoxType.UNTYPED_LAMBDA:
        // boxList[activeBoxIndex] = onUntypedLambdaBlur(boxList[activeBoxIndex])
        break
      
      case BoxType.MARKDOWN: {
        boxList[activeBoxIndex] = onMarkDownBlur(boxList[activeBoxIndex] as NoteState)
        break
      }

      default:
        break
    }

    if (index !== activeBoxIndex || index !== focusedBoxIndex || boxList[index].minimized === true) {
      const futureType : BoxType = boxList[index].type

      const patch = {
        minimized : false,
      }

      switch (futureType) {
        case BoxType.MARKDOWN:
          boxList[index] = {
            ...onMarkDownActive(boxList[index] as NoteState),
            ...patch,
          }
          break
          
        default:
          boxList[index] = {
            ...boxList[index],
            ...patch
          }
          break
      }

      this.props.updateNotebook({ activeBoxIndex : index, focusedBoxIndex : index, boxList })
    }

    // Consumed post-commit below: measures final heights, so collapsing
    // editors or focus UI above cannot shift the box out from under
    // the scroll target. Covers re-clicks on the focused box too.
    this.seatRequested = index
  }

  componentDidUpdate (_prevProps : Props) : void {
    if (this.seatRequested !== null) {
      const index : number = this.seatRequested
      this.seatRequested = null
      this.ensureFocusRoom(index)
    }
    this.syncBodyZen()
  }

  // Seat the focused box just under the fixed bar so it occupies the
  // view. When the document is too short for that, grow an invisible
  // spacer at the bottom to create the missing scroll potential.
  ensureFocusRoom (index : number) : void {
    const el : HTMLLIElement | null | undefined = this.boxRefs[index]
    if (el === null || el === undefined) {
      return
    }

    // Focusing a box seats its top just below the top bar, so the
    // expression occupies the view instead of lingering mid-page.
    // 60 hugs the 52px bar with a breath to spare, leaving maximal
    // room below for the pinned current step. In zen the shown box
    // already starts at the page padding (76), so seating anywhere
    // else would only open the drift the clamp just closed.
    const viewportHeight : number = window.innerHeight
    const top : number = el.getBoundingClientRect().top
    const targetTop : number = this.props.state.zenMode === true ? 76 : 60

    const targetScrollY : number = window.scrollY + top - targetTop
    if (Math.abs(targetScrollY - window.scrollY) < 2) {
      return
    }

    const maxScrollY : number = document.documentElement.scrollHeight - viewportHeight
    if (targetScrollY > maxScrollY) {
      const spacer : HTMLDivElement | null = this.spacerRef.current
      if (spacer !== null) {
        spacer.style.height = `${ Math.ceil(targetScrollY - maxScrollY) + 20 }px`
      }
    }

    window.scrollTo({ top : targetScrollY, behavior : 'smooth' })
  }

  onBlur (index : number) : void {
    // TODO: I may not need onBlur handling in the future
    // I am thinking - right now all it does is this:
    // it un-focuses currently focused Box
    // if this is not really needed - then maybe I should not have this feature

    const { boxList, activeBoxIndex } = this.props.state

    if (activeBoxIndex !== index) {
      return
    }

    const currentType : BoxType = boxList[index].type

    switch (currentType) {
      case BoxType.UNTYPED_LAMBDA:
        // boxList[activeBoxIndex] = onUntypedLambdaBlur(boxList[activeBoxIndex])
        break
      
      case BoxType.MARKDOWN:
        boxList[index] = onMarkDownBlur(boxList[index] as NoteState)
        // return // TODO: just for now
      break

      default:
        break
    }

    this.props.updateNotebook({ boxList, focusedBoxIndex : undefined })
  }
}