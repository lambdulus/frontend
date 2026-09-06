import React, { PureComponent } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import CreateBox from '../components/CreateBox'
import { BoxType, NotebookState, BoxState } from '../Types'

import { onMarkDownBlur, NoteState, onMarkDownActive } from '../markdown-integration/AppTypes'
import { BoxContainer } from '../components/BoxContainer'

interface Props {
  state : NotebookState

  updateNotebook (notebook : Partial<NotebookState>) : void
}

// The prime line under the fixed bar: the box straddling it owns the
// side arrows, whether it got there by click or by plain scrolling.
const PRIME_LINE_PX : number = 100

// Outward page travel swallowed in zen mode before paging to the next
// box: leaving a zen box takes one deliberate extra push.
const ZEN_BUMP_PX : number = 120

// A paused push is a new push: the bump re-arms after this long with
// no wheel input.
const ZEN_BUMP_RESET_MS : number = 300

export interface BoxTop {
  top : number
  height : number
}

// The last box (in order) reaching down past the prime line; hidden
// boxes report no height and never win; with nothing past the line
// the first box stays prime.
export function selectPrimeBox (boxes : Array<BoxTop>, line : number) : number {
  let prime : number = 0
  boxes.forEach((box : BoxTop, i : number) => {
    if (box.height > 0 && box.top <= line) {
      prime = i
    }
  })
  return prime
}

// One zen page in the push direction, or null past either end: zen
// never wraps around.
export function zenStep (anchor : number, length : number, direction : 1 | -1) : number | null {
  const next : number = anchor + direction
  if (next < 0 || next >= length) {
    return null
  }
  return next
}

export default class Notebook extends PureComponent<Props> {
  private boxRefs : Array<HTMLLIElement | null>
  private spacerRef : React.RefObject<HTMLDivElement>
  private seatRequested : number | null
  private zenBump : number
  private zenBumpTimer : number | undefined
  private primeRaf : number | null

  constructor (props : Props) {
    super(props)

    this.boxRefs = []
    this.spacerRef = React.createRef<HTMLDivElement>()
    this.seatRequested = null
    this.zenBump = 0
    this.zenBumpTimer = undefined
    this.primeRaf = null

    this.insertBefore = this.insertBefore.bind(this)
    this.insertAfter = this.insertAfter.bind(this)
    this.removeBox = this.removeBox.bind(this)
    this.updateBoxState = this.updateBoxState.bind(this)
    this.makeActive = this.makeActive.bind(this)
    this.onBlur = this.onBlur.bind(this)
    this.onPageWheel = this.onPageWheel.bind(this)
    this.onPageScroll = this.onPageScroll.bind(this)
  }

  componentDidMount () : void {
    // Page-level wheel stays non-passive for the zen bump; the scroll
    // listener only observes, so it stays passive.
    window.addEventListener('wheel', this.onPageWheel, { passive : false })
    window.addEventListener('scroll', this.onPageScroll, { passive : true })
  }

  componentWillUnmount () : void {
    window.removeEventListener('wheel', this.onPageWheel)
    window.removeEventListener('scroll', this.onPageScroll)
    if (this.zenBumpTimer !== undefined) {
      window.clearTimeout(this.zenBumpTimer)
    }
    if (this.primeRaf !== null) {
      window.cancelAnimationFrame(this.primeRaf)
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
    const prime : number = selectPrimeBox(tops, PRIME_LINE_PX)
    if (prime !== (focusedBoxIndex ?? activeBoxIndex)) {
      this.props.updateNotebook({ focusedBoxIndex : prime })
    }
  }

  // Zen paging: with a single box owning the viewport the page rarely
  // scrolls, so an outward push past the page end turns it after the
  // bump. Events the history pane consumes never reach here (it
  // shields them), so internal history scrolling can never hijack
  // into a page turn.
  onPageWheel (e : WheelEvent) : void {
    const { boxList, activeBoxIndex, focusedBoxIndex, zenMode } = this.props.state
    if (zenMode !== true || boxList.length < 2) {
      return
    }
    const target : EventTarget | null = e.target
    if (target instanceof Element && target.closest('.box-nav, .top-bar') !== null) {
      return
    }

    const unit : number = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1
    const deltaY : number = e.deltaY * unit
    if (Math.abs(deltaY) < Math.abs(e.deltaX)) {
      this.zenBump = 0
      return
    }

    const maxY : number = document.documentElement.scrollHeight - window.innerHeight
    if (! ((deltaY < 0 && window.scrollY <= 1) || (deltaY > 0 && window.scrollY >= maxY - 1))) {
      this.zenBump = 0
      return
    }

    if (this.zenBumpTimer !== undefined) {
      window.clearTimeout(this.zenBumpTimer)
    }
    this.zenBumpTimer = window.setTimeout(() => {
      this.zenBump = 0
      this.zenBumpTimer = undefined
    }, ZEN_BUMP_RESET_MS)

    if (this.zenBump < ZEN_BUMP_PX) {
      e.preventDefault()
      this.zenBump += Math.abs(deltaY)
      return
    }

    this.zenBump = 0
    const next : number | null = zenStep(focusedBoxIndex ?? activeBoxIndex, boxList.length, deltaY < 0 ? -1 : 1)
    if (next !== null) {
      this.makeActive(next)
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
    // room below for the pinned current step.
    const viewportHeight : number = window.innerHeight
    const top : number = el.getBoundingClientRect().top
    const targetTop : number = 60

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