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

// The prime line sits a little below the vertical center of the view
// (65% down): the box owning the most of the view above it owns the
// side arrows, whether it got there by click or by plain scrolling.
// Measuring shares instead of tops keeps the handover honest: a short
// next box no longer steals focus while the current one still fills
// the upper view; it takes over only once it actually displaces it.
// Ties stay with the upper box. Hidden boxes report no height and
// never win; with nothing in the upper view the last box stays prime
// past the end and the first before the start.
export interface BoxTop {
  top : number
  height : number }

// Scroll-prime stays quiet this long after a programmatic seat lands:
// long enough for any smooth glide to arrive, short enough that plain
// scrolling never feels frozen.
const SEAT_SETTLE_MS : number = 600
// Scroll-end backstop: re-prime once motion stops so the focus always
// ends on the landed layout.
const SCROLL_END_MS : number = 150
export function selectPrimeBox (boxes : Array<BoxTop>, line : number) : number {
  let prime : number = 0
  let best : number = 0
  boxes.forEach((box : BoxTop, i : number) => {
    const share : number = Math.max(0, Math.min(box.top + box.height, line) - Math.max(box.top, 0))
    if (share > best) {
      best = share
      prime = i
    }
  })
  if (best === 0 && boxes.length > 0) {
    const last : BoxTop = boxes[boxes.length - 1]
    prime = last.top + last.height <= 0 ? boxes.length - 1 : 0
  }
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

// One line on the box map: box titles are gone, so a lambda box shows
// its initial term and a note shows its title, each with a fallback.
export function mapBoxLabel (box : BoxState) : string {
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
  private mapListRef : React.RefObject<HTMLDivElement>
  private seatRequested : number | null
  private lastSeatAt : number
  private primeRaf : number | null
  private primeTrail : number | null
  private preZenScrollY : number | null

  constructor (props : Props) {
    super(props)

    this.boxRefs = []
    this.mapListRef = React.createRef<HTMLDivElement>()
    this.seatRequested = null
    this.lastSeatAt = 0
    this.primeRaf = null
    this.primeTrail = null
    this.preZenScrollY = null
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
    if (this.primeTrail !== null) {
      window.clearTimeout(this.primeTrail)
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

  // Box-to-box paging by key: ArrowUp/ArrowDown move the anchor in
  // both modes, unless the keystroke belongs to someone else - an
  // editor, or the history pane, which scrolls itself with the arrows
  // while a step inside it holds focus.
  onPageKeyDown (e : KeyboardEvent) : void {
    const { boxList, activeBoxIndex, focusedBoxIndex } = this.props.state
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') {
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
    // The arrows belong to paging (and to the history pane and the
    // editors, handled above): never let them nudge the page itself,
    // not even past the first or last box.
    e.preventDefault()
    if (next !== null) {
      this.makeActive(next)
    }
  }

  // Plain scrolling moves the prime view, so the side arrows follow
  // it: whichever box owns the most of the upper view becomes their
  // anchor.
  // Throttled to one measure per frame, and only ever re-renders on
  // an actual anchor change. A trailing sync fires once motion stops:
  // a long seat-glide can outlast the settle guard, letting a tail
  // scroll event re-prime from mid-flight geometry with nothing
  // correcting it after landing; measuring the landed layout fixes
  // the anchor on the seated box. Plain user scrolls just get the
  // same prime the frame syncs would have given them.
  onPageScroll () : void {
    if (this.primeTrail !== null) {
      window.clearTimeout(this.primeTrail)
    }
    this.primeTrail = window.setTimeout(() => {
      this.primeTrail = null
      this.syncAnchorToPrime()
    }, SCROLL_END_MS)
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
    // A programmatic seat glides past intermediate boxes on its way:
    // letting scroll-prime read mid-flight would yank the focus back
    // and forth, flickering the map. It resumes once the seat lands.
    if (Date.now() - this.lastSeatAt < SEAT_SETTLE_MS) {
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
    const prime : number = selectPrimeBox(tops, window.innerHeight * 0.65)
    // TEMP-DEBUG: revert before merging.
    console.log('[zen-debug] prime', { y : window.scrollY, tops, prime, focused : focusedBoxIndex, active : activeBoxIndex })
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
                isAnchorBox={ anchor === i }
                zen={ zen }
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
        {
          // Permanent scroll potential below the last box: sized so any
          // box can be seated at the top with room to spare, present
          // from first paint so small trailing boxes seat the same on
          // a fresh load as after a focus. Hidden in zen and omitted
          // for an empty notebook, where it would only be dead scroll.
          boxList.length === 0 ?
            null
          :
            <div className='notebook-bottom-spacer' />
        }
        {
          // Box map: one line per box (initial terms, titles gone),
          // riding the right viewport edge in both modes, capped at
          // 70% of the view and scrolling under fades past that.
          // Clicking a line jumps straight to its box; the anchor
          // carries the accent bar, flanked by the paging arrows that
          // echo the arrow keys (the floating box arrows are retired).
          boxList.length > 0 ?
            <nav className='box-map' aria-label='Boxes in this notebook'>
              <div
                className={ `box-map-list${ this.state.mapAtTop ? '' : ' mask-top' }${ this.state.mapAtBottom ? '' : ' mask-bottom' }` }
                ref={ this.mapListRef }
                onScroll={ (e) => this.syncMapEdges(e.currentTarget) }
              >
                {
                  boxList.map((box : BoxState, i : number) => (
                    <React.Fragment key={ box.__key }>
                      {
                        i === anchor && hasPrev ?
                          <button
                            className='box-map-arrow'
                            title='Previous box (ArrowUp)'
                            aria-label='Previous box'
                            onClick={ () => this.makeActive(anchor - 1) }
                          >
                            <ChevronUp size={ 14 } strokeWidth={ 2 } />
                          </button>
                        :
                          null
                      }
                      <button
                        className={ `box-map-item${ i === anchor ? ' box-map-item--current' : '' }` }
                        title={ mapBoxLabel(box) }
                        onClick={ () => this.makeActive(i) }
                      >
                        <span className='box-map-label'>{ mapBoxLabel(box) }</span>
                      </button>
                      {
                        i === anchor && hasNext ?
                          <button
                            className='box-map-arrow'
                            title='Next box (ArrowDown)'
                            aria-label='Next box'
                            onClick={ () => this.makeActive(anchor + 1) }
                          >
                            <ChevronDown size={ 14 } strokeWidth={ 2 } />
                          </button>
                        :
                          null
                      }
                    </React.Fragment>
                  ))
                }
              </div>
            </nav>
          :
            null
        }
        {
          // Fixed box-to-box navigator: jumps to the previous/next box
          // and focuses it (seating included). Retired from view in
          // favor of the map arrows (CSS hides it); the markup stays
          // for an easy revert. Hidden for an empty notebook; each
          // arrow enables only while a box exists in its direction.
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
        {
          // Zen add-box: the per-box + rows step out with the other box
          // furniture and the page never scrolls to them, so a floating
          // New-box button rides the bottom-right corner instead. The
          // type picker opens in place above it; inserting after the
          // anchor focuses the new box at once.
          zen ?
            <div className='zen-add'>
              <CreateBox
                addNew={ (box : BoxState) => {
                  if (boxList.length === 0) {
                    this.insertBefore(0, box)
                  }
                  else {
                    this.insertAfter(anchor, box)
                  }
                } }
              />
            </div>
          :
            null
        }
      </div>
    )
  }

  insertBefore (index : number, box : BoxState) : void {
    const { boxList } = this.props.state

    const boxListCopy = [ ...boxList ]

    boxListCopy.splice(index, 0, box)

    this.props.updateNotebook({ boxList : boxListCopy, activeBoxIndex : index, focusedBoxIndex : index })
    this.seatRequested = index
  }

  insertAfter (index : number, box : BoxState) : void {

    const { boxList } = this.props.state

    boxList.splice(index + 1, 0, box)
    this.props.updateNotebook({ boxList : boxList, activeBoxIndex : index + 1, focusedBoxIndex : index + 1})
    this.seatRequested = index + 1
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

  componentDidUpdate (prevProps : Props) : void {
    if (this.seatRequested !== null) {
      const index : number = this.seatRequested
      this.seatRequested = null
      this.ensureFocusRoom(index)
    }
    // A zen flip reflows the whole page discontinuously (entering
    // collapses every other box out, leaving brings the title and
    // siblings back), so gliding anywhere reads as a stuttery travel
    // through space that no longer exists. Entering parks the page at
    // the top instantly: the anchor owns the viewport by construction.
    // Leaving restores the exact pre-zen scroll position the same way:
    // the layout is the one we left, so the anchor lands back on its
    // seat with nothing moving. (Box pinning steps aside across the
    // flip, so these jumps are the only scrolls.)
    //
    // Order matters: the body scroll lock must follow the mode BEFORE
    // any flip jump runs. Restoring the deep pre-zen position while
    // the zen lock is still on clamps the jump back to the top,
    // stranding the view on the first box (and re-priming focus onto
    // it); parking while unlocked is harmless either way.
    const zenFlipped : boolean = this.props.state.zenMode !== prevProps.state.zenMode
    if (zenFlipped && this.props.state.zenMode === true) {
      this.preZenScrollY = window.scrollY
    }
    // TEMP-DEBUG: revert before merging.
    if (zenFlipped) {
      console.log('[zen-debug] flip', { to : this.props.state.zenMode, scrollY : window.scrollY, preZen : this.preZenScrollY, lockBefore : document.body.classList.contains('zen') })
    }
    this.syncBodyZen()
    if (zenFlipped) {
      // TEMP-DEBUG: revert before merging.
      console.log('[zen-debug] jump', { to : this.props.state.zenMode, target : this.props.state.zenMode === true ? 0 : this.preZenScrollY, lockAfter : document.body.classList.contains('zen') })
      if (this.props.state.zenMode === true) {
        window.scrollTo({ top : 0, behavior : 'auto' })
      }
      else if (this.preZenScrollY !== null) {
        window.scrollTo({ top : this.preZenScrollY, behavior : 'auto' })
      }
      else {
        const { focusedBoxIndex, activeBoxIndex } = this.props.state
        this.ensureFocusRoom(focusedBoxIndex ?? activeBoxIndex)
      }
    }
  }

  // Seat the focused box just under the fixed bar so it occupies the
  // view. The permanent bottom spacer holds enough scroll potential
  // for any box to reach the seating position, so this only scrolls.
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
    const top : number = el.getBoundingClientRect().top
    const targetTop : number = this.props.state.zenMode === true ? 76 : 60

    const targetScrollY : number = window.scrollY + top - targetTop
    // TEMP-DEBUG: revert before merging.
    console.log('[zen-debug] seat', { index, from : window.scrollY, top, target : targetScrollY })
    if (Math.abs(targetScrollY - window.scrollY) < 2) {
      return
    }

    this.lastSeatAt = Date.now()
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