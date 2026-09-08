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

  // App-wide delete confirmation (absent call sites keep asking).
  confirmBoxDelete? : boolean
  onConfirmBoxDeleteChange? : (confirm : boolean) => void
}

// The prime line sits in the upper third of the view: the box owning
// the most of the view above it owns the side arrows, whether it got
// there by click or by plain scrolling. A low (center-ish) line lets a
// tall box below outshare a tiny middle box at every scroll position,
// so slow scrolling skips it outright; up here the middle box wins its
// window as soon as it displaces its predecessor. Measuring shares
// instead of tops keeps the handover honest: a short next box no longer
// steals focus while the current one still fills the upper view; it
// takes over only once it actually displaces it. Ties stay with the
// upper box. Hidden boxes report no height and never win; with nothing
// in the upper view the last box stays prime past the end and the first
// before the start.
const PRIME_LINE_RATIO : number = 0.35
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
// One wheel push over the map pages a single box in zen: enough
// travel for a mouse notch or a short trackpad push. The gesture then
// goes deaf until it truly ends (a sliding quiet window, so a flick's
// momentum tail — however long — can never page twice), and the next
// push starts fresh. An endless stream is deliberate continuous
// scrolling, not momentum: past the first window it cruises, paging
// on a short cadence while the strength stays up, never from a dying
// tail. A quiet pause restarts the accumulation instead.
const ZEN_WHEEL_STEP_PX : number = 60
// A gap this long ends the gesture: the next event starts fresh.
const ZEN_WHEEL_QUIET_MS : number = 150
// A stream still flowing past this long after a page is deliberate,
// not momentum: violent flicks coast well under two seconds, and a
// tail that old has decayed past the cruise gate anyway. Strength
// decides whether the survivor cruises or waits out.
const ZEN_WHEEL_CAP_MS : number = 2000
// A fresh push landing mid-flow re-arms at once: new finger energy
// spikes past the flow's slow baseline, while one flick's own ramp
// never dips first. Past this multiple of the baseline (and a floor,
// so jitter never trips it), and only once the flow has dipped below
// this many pixels since the page (a re-push follows a dip — the
// lift and return — while a still-rising ramp never dips at all),
// the motion is a new push, not the old tail. The baseline chases
// cooling fast and warming slow, so it hugs a decaying tail but lags
// a rising push.
const ZEN_WHEEL_ONSET_RATIO : number = 1.6
const ZEN_WHEEL_ONSET_FLOOR : number = 6
const ZEN_WHEEL_BASE_DOWN_ALPHA : number = 0.3
const ZEN_WHEEL_BASE_UP_ALPHA : number = 0.05
const ZEN_WHEEL_DIP_PX : number = 15
// A full-notch shove after a short gap is a mouse wheel, not a
// trackpad stream: honor it at once instead of holding it for the
// quiet window, so rapid spinning pages per notch.
const ZEN_WHEEL_QUICK_MS : number = 80
const ZEN_WHEEL_NOTCH_PX : number = 100
// Cruise cadence once sustained input proves itself deliberate.
const ZEN_WHEEL_CRUISE_MS : number = 300
// Gesture strength tracker: trip the cruise only while the flow runs
// hot against the page's own onset, never on a cooling tail.
const ZEN_WHEEL_EMA_ALPHA : number = 0.25
const ZEN_WHEEL_CRUISE_RATIO : number = 0.4

// Paging revision marker: the console reports which gesture logic a
// tab actually runs, so a stale tab never gets debugged as live code
// again. Bump on every behavior change to the strip gestures.
const ZEN_WHEEL_REV : number = 9
const zenWheelRevTarget : Record<string, unknown> = window as unknown as Record<string, unknown>
zenWheelRevTarget.__zenWheelRev = ZEN_WHEEL_REV

// Paging diagnostics: set window.__zenWheelDebug = true in the
// console and swipe over the map strip — one line per wheel event,
// each naming the rule that owned it.
function zenWheelLog (message : string) : void {
  if ((window as unknown as Record<string, unknown>).__zenWheelDebug === true) {
    console.log(`zenwheel rev=${ZEN_WHEEL_REV} ${message}`)
  }
}
// A touchscreen swipe pages past this travel, taps (and list scrolls)
// staying below it.
const ZEN_TOUCH_STEP_PX : number = 24

// Macro tables follow focus, but only the ones the user opened: the
// focused box restores its remembered dock, every other box collapses
// its own, so an open table never overlaps the boxes below. Focus never
// opens a dock by itself — a fresh box stays a pill until its head is
// worked — and a hand-closed dock stays shut across refocus. Zen mode
// restores nothing: one clean box owns the viewport, and a table the
// hand opens there still collapses on blur like everywhere else.
// Returns the same array when every table already matches, so callers
// never re-render for a no-op.
export function syncDocksToFocus (boxList : Array<BoxState>, focusedIndex : number | null | undefined, zenMode : boolean = false) : Array<BoxState> {
  let changed : boolean = false
  const next : Array<BoxState> = boxList.map((box : BoxState, i : number) => {
    if (box.type !== BoxType.UNTYPED_LAMBDA) {
      return box
    }

    const wantOpen : boolean = ! zenMode && i === focusedIndex && (box as UntypedLambdaState).macrolistWanted === true

    if ((box as UntypedLambdaState).macrolistOpen === wantOpen) {
      return box
    }

    changed = true
    return { ...(box as UntypedLambdaState), macrolistOpen : wantOpen }
  })

  return changed ? next : boxList
}

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
  confirmDeleteIndex : number | null
}

export default class Notebook extends PureComponent<Props, State> {
  private dontAskRef : React.RefObject<HTMLInputElement>
  private boxRefs : Array<HTMLLIElement | null>
  private mapListRef : React.RefObject<HTMLDivElement>
  private seatRequested : number | null
  private lastSeatAt : number
  private primeRaf : number | null
  private primeTrail : number | null
  private listRef : React.RefObject<HTMLUListElement>
  private listObserver : ResizeObserver | null
  private mapNavRef : React.RefObject<HTMLElement>
  private mapNavEl : HTMLElement | null
  private zenWheelAccum : number
  private zenWheelDir : 1 | -1 | 0
  private zenWheelLast : number
  private zenWheelLastStamp : number
  private zenWheelDeaf : boolean
  private zenWheelEma : number
  private zenWheelFireEma : number
  private zenWheelBase : number
  private zenWheelDipMin : number
  private zenWheelQuietTimer : number | null
  private zenWheelCapTimer : number | null
  private zenTouchY : number | null
  private zenTouchListTop : number | null

  constructor (props : Props) {
    super(props)

    this.dontAskRef = React.createRef<HTMLInputElement>()
    this.boxRefs = []
    this.mapListRef = React.createRef<HTMLDivElement>()
    this.seatRequested = null
    this.lastSeatAt = 0
    this.primeRaf = null
    this.primeTrail = null
    this.listRef = React.createRef<HTMLUListElement>()
    this.listObserver = null
    this.mapNavRef = React.createRef<HTMLElement>()
    this.mapNavEl = null
    this.zenWheelAccum = 0
    this.zenWheelDir = 0
    this.zenWheelLast = 0
    this.zenWheelLastStamp = 0
    this.zenWheelDeaf = false
    this.zenWheelEma = 0
    this.zenWheelFireEma = 0
    this.zenWheelBase = 0
    this.zenWheelDipMin = Number.POSITIVE_INFINITY
    this.zenWheelQuietTimer = null
    this.zenWheelCapTimer = null
    this.zenTouchY = null
    this.zenTouchListTop = null
    this.state = { mapAtTop : true, mapAtBottom : true, confirmDeleteIndex : null }

    this.insertBefore = this.insertBefore.bind(this)
    this.insertAfter = this.insertAfter.bind(this)
    this.removeBox = this.removeBox.bind(this)
    this.requestRemoveBox = this.requestRemoveBox.bind(this)
    this.confirmDeleteBox = this.confirmDeleteBox.bind(this)
    this.cancelDeleteBox = this.cancelDeleteBox.bind(this)
    this.updateBoxState = this.updateBoxState.bind(this)
    this.makeActive = this.makeActive.bind(this)
    this.onBlur = this.onBlur.bind(this)
    this.onPageKeyDown = this.onPageKeyDown.bind(this)
    this.onPageScroll = this.onPageScroll.bind(this)
    this.onMapWheel = this.onMapWheel.bind(this)
    this.onMapTouchStart = this.onMapTouchStart.bind(this)
    this.onMapTouchEnd = this.onMapTouchEnd.bind(this)
  }

  componentDidMount () : void {
    window.addEventListener('keydown', this.onPageKeyDown)
    window.addEventListener('scroll', this.onPageScroll, { passive : true })
    // Async content settling (editors, fonts) can move the page
    // without firing scroll events, leaving focus stale on a box the
    // view no longer shows; re-priming off the list's own resizes
    // keeps the anchor on what is actually visible.
    if (typeof ResizeObserver !== 'undefined' && this.listRef.current !== null) {
      this.listObserver = new ResizeObserver(() => {
        this.syncAnchorToPrime()
      })
      this.listObserver.observe(this.listRef.current)
    }
    this.syncBodyZen()
    this.syncMapEdges()
    this.attachMapGestures()
  }

  // The map's paging gestures listen natively: React's delegated wheel
  // listener is passive, but paging needs preventDefault, and the map
  // nav mounts conditionally (empty notebooks have none). Tracked by
  // node, so each nav gets exactly one set across remounts.
  attachMapGestures () : void {
    const nav : HTMLElement | null = this.mapNavRef.current
    if (nav === this.mapNavEl) {
      return
    }
    if (this.mapNavEl !== null) {
      this.mapNavEl.removeEventListener('wheel', this.onMapWheel)
      this.mapNavEl.removeEventListener('touchstart', this.onMapTouchStart)
      this.mapNavEl.removeEventListener('touchend', this.onMapTouchEnd)
    }
    this.mapNavEl = nav
    if (nav !== null) {
      nav.addEventListener('wheel', this.onMapWheel, { passive : false })
      nav.addEventListener('touchstart', this.onMapTouchStart, { passive : true })
      nav.addEventListener('touchend', this.onMapTouchEnd, { passive : true })
    }
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
    if (this.listObserver !== null) {
      this.listObserver.disconnect()
    }
    if (this.mapNavEl !== null) {
      this.mapNavEl.removeEventListener('wheel', this.onMapWheel)
      this.mapNavEl.removeEventListener('touchstart', this.onMapTouchStart)
      this.mapNavEl.removeEventListener('touchend', this.onMapTouchEnd)
      this.mapNavEl = null
    }
    if (this.zenWheelQuietTimer !== null) {
      window.clearTimeout(this.zenWheelQuietTimer)
      this.zenWheelQuietTimer = null
    }
    if (this.zenWheelCapTimer !== null) {
      window.clearTimeout(this.zenWheelCapTimer)
      this.zenWheelCapTimer = null
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
    const prime : number = selectPrimeBox(tops, window.innerHeight * PRIME_LINE_RATIO)
    if (prime !== (focusedBoxIndex ?? activeBoxIndex)) {
      this.props.updateNotebook({ focusedBoxIndex : prime, boxList : syncDocksToFocus(boxList, prime, this.props.state.zenMode) })
    }
  }

  // Zen paging over the map strip: one accumulated push steps a single
  // box. The gesture then goes deaf: the tail never pages twice, while
  // a fresh push spiking out of a dip re-arms mid-flow, so continuous
  // swiping pages push by push. Outside zen the strip keeps its native
  // behavior (list scrolls, page chains). A map list with room left in
  // the push direction keeps the event, so long maps scroll to their
  // end before paging continues past it.
  onMapWheel (e : WheelEvent) : void {
    if (this.props.state.zenMode !== true) {
      return
    }
    const unit : number = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 480 : 1
    const deltaY : number = e.deltaY * unit
    if (deltaY === 0) {
      return
    }
    const dir : 1 | -1 = deltaY > 0 ? 1 : -1
    const list : HTMLDivElement | null = this.mapListRef.current
    if (list !== null) {
      const roomDown : boolean = list.scrollHeight - list.scrollTop - list.clientHeight > 1
      const roomUp : boolean = list.scrollTop > 1
      if ((dir === 1 && roomDown) || (dir === -1 && roomUp)) {
        zenWheelLog(`mag=${Math.round(Math.abs(deltaY))} list keeps it (room to scroll)`)
        return
      }
    }
    e.preventDefault()

    const now : number = Date.now()
    const mag : number = Math.abs(deltaY)
    zenWheelLog(`event mag=${Math.round(mag)} dir=${dir} accum=${Math.round(this.zenWheelAccum)} deaf=${this.zenWheelDeaf} base=${Math.round(this.zenWheelBase)}`)
    // A quiet gap ends the previous gesture: fresh hand, fresh count.
    // Both clocks must agree — a stall (say, the page's own re-render)
    // can hold events back for longer than the window, and that pause
    // is main-thread jank, not a lifted hand. A full-notch shove after
    // a short gap is a mouse wheel talking, and it gets the same.
    const wallGap : number = now - this.zenWheelLast
    const stampGap : number = e.timeStamp - this.zenWheelLastStamp
    const rested : boolean = wallGap > ZEN_WHEEL_QUIET_MS && stampGap > ZEN_WHEEL_QUIET_MS
    const notched : boolean = mag >= ZEN_WHEEL_NOTCH_PX && wallGap > ZEN_WHEEL_QUICK_MS && stampGap > ZEN_WHEEL_QUICK_MS
    if (rested || notched) {
      this.clearZenDeaf()
      this.zenWheelDir = dir
      this.zenWheelAccum = 0
      this.zenWheelBase = mag
      this.zenWheelDipMin = mag
      zenWheelLog(rested ? 'fresh gesture' : 'notch fast lane')
    }
    this.zenWheelLast = now
    this.zenWheelLastStamp = e.timeStamp
    this.zenWheelEma += ZEN_WHEEL_EMA_ALPHA * (mag - this.zenWheelEma)
    // A fresh push into a dying tail re-arms mid-gesture: new energy
    // spikes past the flow's baseline, so the next swipe never waits
    // out the last one's momentum. Runs before the fire check, so a
    // page never re-arms on its own onset.
    if (this.zenWheelDeaf
      && mag > Math.max(ZEN_WHEEL_ONSET_FLOOR, ZEN_WHEEL_ONSET_RATIO * this.zenWheelBase)
      && this.zenWheelDipMin < ZEN_WHEEL_DIP_PX) {
      this.clearZenDeaf()
      this.zenWheelDir = dir
      this.zenWheelAccum = 0
      this.zenWheelDipMin = mag
      zenWheelLog('onset re-arm')
    }
    // The baseline hugs cooling and lags warming: a decaying tail
    // drags it down event over event, while a rising push leaves it
    // behind — exactly the split the onset check reads. The dip watch
    // runs behind the checks, so each event is judged against the dips
    // of its predecessors, never its own.
    this.zenWheelBase += (mag < this.zenWheelBase ? ZEN_WHEEL_BASE_DOWN_ALPHA : ZEN_WHEEL_BASE_UP_ALPHA) * (mag - this.zenWheelBase)
    this.zenWheelDipMin = Math.min(this.zenWheelDipMin, mag)
    // A reversal restarts the count without breaking the deafness:
    // jitter across the axis never stacks into a page.
    if (dir !== this.zenWheelDir) {
      this.zenWheelDir = dir
      this.zenWheelAccum = 0
    }
    this.zenWheelAccum += mag
    if (! this.zenWheelDeaf && this.zenWheelAccum >= ZEN_WHEEL_STEP_PX) {
      this.zenWheelAccum = 0
      this.pageZen(dir)
      zenWheelLog(`PAGE dir=${dir}`)
      this.zenWheelDeaf = true
      this.zenWheelFireEma = this.zenWheelEma
      this.zenWheelDipMin = Number.POSITIVE_INFINITY
      this.armZenCap(ZEN_WHEEL_CAP_MS)
    }
    else {
      zenWheelLog('hold')
    }
    if (this.zenWheelDeaf) {
      // Sliding quiet window: the gesture ends 150ms after its last
      // event, however long its momentum runs.
      if (this.zenWheelQuietTimer !== null) {
        window.clearTimeout(this.zenWheelQuietTimer)
      }
      this.zenWheelQuietTimer = window.setTimeout(() => {
        this.zenWheelQuietTimer = null
        zenWheelLog('quiet unlock')
        this.clearZenDeaf()
      }, ZEN_WHEEL_QUIET_MS)
    }
  }

  // The gesture is over: hear everything again, timers included.
  clearZenDeaf () : void {
    this.zenWheelDeaf = false
    this.zenWheelAccum = 0
    this.zenWheelDipMin = Number.POSITIVE_INFINITY
    if (this.zenWheelQuietTimer !== null) {
      window.clearTimeout(this.zenWheelQuietTimer)
      this.zenWheelQuietTimer = null
    }
    if (this.zenWheelCapTimer !== null) {
      window.clearTimeout(this.zenWheelCapTimer)
      this.zenWheelCapTimer = null
    }
  }

  armZenCap (windowMs : number) : void {
    if (this.zenWheelCapTimer !== null) {
      window.clearTimeout(this.zenWheelCapTimer)
    }
    this.zenWheelCapTimer = window.setTimeout(() => {
      this.zenWheelCapTimer = null
      this.onZenCapTrip()
    }, windowMs)
  }

  // A stream still flowing this far past a page is deliberate input,
  // not momentum — but only while it still runs hot. Sustained
  // strength cruises on a short cadence; a cooling tail just waits
  // out the quiet window, never earning a second page.
  onZenCapTrip () : void {
    if (! this.zenWheelDeaf || this.zenWheelDir === 0) {
      return
    }
    if (this.zenWheelEma > ZEN_WHEEL_CRUISE_RATIO * this.zenWheelFireEma) {
      this.zenWheelAccum = 0
      this.pageZen(this.zenWheelDir)
      zenWheelLog('cap trip: cruise PAGE')
      this.armZenCap(ZEN_WHEEL_CRUISE_MS)
    }
    else {
      zenWheelLog('cap trip: tail cooling, extend')
      this.armZenCap(ZEN_WHEEL_CRUISE_MS)
    }
  }

  // Touchscreen twin of the wheel trigger: a swipe over the strip
  // steps one box. Taps stay under the travel bar; a swipe that
  // scrolled the map list belongs to the list, never to paging.
  onMapTouchStart (e : TouchEvent) : void {
    if (this.props.state.zenMode !== true) {
      return
    }
    const touch : Touch | undefined = e.touches[0] ?? e.changedTouches[0]
    if (touch === undefined) {
      return
    }
    this.zenTouchY = touch.clientY
    this.zenTouchListTop = this.mapListRef.current?.scrollTop ?? null
  }

  onMapTouchEnd (e : TouchEvent) : void {
    if (this.props.state.zenMode !== true || this.zenTouchY === null) {
      return
    }
    const touch : Touch | undefined = e.changedTouches[0] ?? e.touches[0]
    const startY : number = this.zenTouchY
    const startTop : number | null = this.zenTouchListTop
    this.zenTouchY = null
    this.zenTouchListTop = null
    if (touch === undefined) {
      return
    }
    if (startTop !== null && this.mapListRef.current !== null && this.mapListRef.current.scrollTop !== startTop) {
      return
    }
    const travel : number = startY - touch.clientY
    if (Math.abs(travel) < ZEN_TOUCH_STEP_PX) {
      return
    }
    this.pageZen(travel > 0 ? 1 : -1)
  }

  // One zen page by gesture: past either end the push lands quietly,
  // the page lock already barring every other motion.
  pageZen (dir : 1 | -1) : void {
    const { boxList, focusedBoxIndex, activeBoxIndex } = this.props.state
    const next : number | null = zenStep(focusedBoxIndex ?? activeBoxIndex, boxList.length, dir)
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
        <ul className="boxList UL" ref={ this.listRef }>
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
                removeBox={ () => this.requestRemoveBox(i) }
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
          // In zen the whole strip pages box-to-box on wheel or swipe,
          // caught by the invisible hitbox reaching past the short map
          // small notebooks draw; the list keeps its own scrolling
          // where it still has room to travel.
          boxList.length > 0 ?
            <nav className='box-map' aria-label='Boxes in this notebook' ref={ this.mapNavRef }>
              <div className='box-map-hitbox' aria-hidden='true' />
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
        {
          // Delete confirmation for the trash icon. A stale parked index
          // (the list changed under the open dialog) dismisses itself.
          this.state.confirmDeleteIndex !== null && boxList[this.state.confirmDeleteIndex] !== undefined ?
            <div className='box-delete-confirm'>
              <div className='box-delete-confirm-backdrop' onClick={ () => this.cancelDeleteBox() } />
              <div className='box-delete-confirm-card' role='alertdialog' aria-label='Delete this box?'>
                <p className='box-delete-confirm-title'>
                  Delete this box?
                </p>
                <label className='box-delete-confirm-again'>
                  <input type='checkbox' ref={ this.dontAskRef } />
                  Don&apos;t ask me this again
                </label>
                <div className='box-delete-confirm-actions'>
                  <button
                    className='box-delete-confirm-cancel'
                    onClick={ () => this.cancelDeleteBox() }
                  >
                    Cancel
                  </button>
                  <button
                    className='box-delete-confirm-delete'
                    onClick={ () => this.confirmDeleteBox() }
                  >
                    Delete
                  </button>
                </div>
              </div>
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

    this.props.updateNotebook({ boxList : syncDocksToFocus(boxListCopy, index, this.props.state.zenMode), activeBoxIndex : index, focusedBoxIndex : index })
    this.seatRequested = index
  }

  insertAfter (index : number, box : BoxState) : void {

    const { boxList } = this.props.state

    boxList.splice(index + 1, 0, box)
    this.props.updateNotebook({ boxList : syncDocksToFocus(boxList, index + 1, this.props.state.zenMode), activeBoxIndex : index + 1, focusedBoxIndex : index + 1})
    this.seatRequested = index + 1
  }

  // The trash icon lands here: with asking on, the index parks in the
  // confirm dialog instead of deleting outright.
  requestRemoveBox (index : number) : void {
    if ((this.props.confirmBoxDelete ?? true) === true) {
      this.setState({ confirmDeleteIndex : index })
    }
    else {
      this.removeBox(index)
    }
  }

  // "Don't ask me again" applies on either button; only Delete removes.
  applyDontAskAgain () : void {
    if (this.dontAskRef.current !== null && this.dontAskRef.current.checked) {
      this.props.onConfirmBoxDeleteChange?.(false)
    }
  }

  confirmDeleteBox () : void {
    const index : number | null = this.state.confirmDeleteIndex
    this.applyDontAskAgain()
    this.setState({ confirmDeleteIndex : null })
    if (index !== null) {
      this.removeBox(index)
    }
  }

  cancelDeleteBox () : void {
    this.applyDontAskAgain()
    this.setState({ confirmDeleteIndex : null })
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

      this.props.updateNotebook({ activeBoxIndex : index, focusedBoxIndex : index, boxList : syncDocksToFocus(boxList, index, this.props.state.zenMode) })
    }

    // Consumed post-commit below: measures final heights, so collapsing
    // editors or focus UI above cannot shift the box out from under
    // the scroll target. Covers re-clicks on the focused box too.
    this.seatRequested = index
  }

  componentDidUpdate (prevProps : Props) : void {
    this.attachMapGestures()
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
    this.syncBodyZen()
    if (zenFlipped) {
      if (this.props.state.zenMode === true) {
        window.scrollTo({ top : 0, behavior : 'auto' })
      }
      else {
        // Leaving: seat the anchor instantly, never restore pixels.
        // The layout may have shifted silently while away (async
        // content settling moves the scroll without firing scroll
        // events), so a recorded position can point at the wrong box;
        // the anchor's identity stays right whatever moved.
        const { focusedBoxIndex, activeBoxIndex } = this.props.state
        this.ensureFocusRoom(focusedBoxIndex ?? activeBoxIndex, 'auto')
      }
    }
  }

  // Seat the focused box just under the fixed bar so it occupies the
  // view. The permanent bottom spacer holds enough scroll potential
  // for any box to reach the seating position, so this only scrolls.
  ensureFocusRoom (index : number, behavior : ScrollBehavior = 'smooth') : void {
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
    if (Math.abs(targetScrollY - window.scrollY) < 2) {
      return
    }

    this.lastSeatAt = Date.now()
    window.scrollTo({ top : targetScrollY, behavior })
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

    this.props.updateNotebook({ boxList : syncDocksToFocus(boxList, undefined, this.props.state.zenMode), focusedBoxIndex : undefined })
  }
}