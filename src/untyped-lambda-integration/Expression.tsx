 import React, { PureComponent } from 'react'
import { Copy } from 'lucide-react'

import Step from './Step'
import { UntypedLambdaState, Breakpoint, StepRecord } from './Types'
import Editor from '../components/Editor'
import { mapLeftFromTo } from '../misc'

import './styles/Expression.css'

// Outward wheel travel swallowed at either end of the history before
// the scroll chains out to the notebook: crossing an end costs a
// single small tick, just enough to stop accidental slip-throughs
// mid-gesture without ever fighting a deliberate push.
const HISTORY_EDGE_BUMP_PX : number = 24

// A paused push is a new push: the bump re-arms after this long with
// no wheel input, so separate gestures never stack up into a wall.
const EDGE_BUMP_RESET_MS : number = 150

interface EvaluatorProps {
  className : string
  state : UntypedLambdaState
  breakpoints : Array<Breakpoint>
  history : Array<StepRecord>
  editor : {
    placeholder : string
    content : string
    syntaxError : Error | null
  }
  isNormalForm : boolean
  isExercise : boolean

  createBoxFrom (stepRecord : StepRecord) : UntypedLambdaState
  setBoxState (state : UntypedLambdaState) : void
  onContent (content : string) : void
  onEnter () : void
  onExecute () : void
  addBox (box : UntypedLambdaState) : void
  shouldShowDebugControls : boolean
}

interface ExpressionState {
  historyAtBottom : boolean
  historyAtTop : boolean
}

export default class Expression extends PureComponent<EvaluatorProps, ExpressionState> {
  private historyRef : React.RefObject<HTMLDivElement>
  private initialRef : React.RefObject<HTMLDivElement>
  private currentRef : React.RefObject<HTMLDivElement>
  private followTail : boolean
  private edgeBump : number
  private edgeBumpTimer : number | undefined

  constructor (props : EvaluatorProps) {
    super(props)

    this.historyRef = React.createRef<HTMLDivElement>()
    this.initialRef = React.createRef<HTMLDivElement>()
    this.currentRef = React.createRef<HTMLDivElement>()
    this.followTail = true
    this.edgeBump = 0
    this.edgeBumpTimer = undefined
    this.state = { historyAtBottom : true, historyAtTop : true }
    this.addBreakpoint = this.addBreakpoint.bind(this)
    this.onHistoryWheel = this.onHistoryWheel.bind(this)
    this.onEndpointWheel = this.onEndpointWheel.bind(this)
  }

  // Native listeners dedupe identical registrations, so attaching on
  // every update is safe; the endpoint pins mount conditionally.
  attachWheelListeners () : void {
    const history : HTMLDivElement | null = this.historyRef.current
    if (history !== null) {
      // React's delegated wheel listener is passive, but the bump
      // needs preventDefault, so listen natively and non-passively.
      history.addEventListener('wheel', this.onHistoryWheel, { passive : false })
    }
    // The pinned endpoint steps sit outside the scroll container, so
    // without forwarding the wheel over them chains straight past
    // the box to the notebook.
    const initial : HTMLDivElement | null = this.initialRef.current
    if (initial !== null) {
      initial.addEventListener('wheel', this.onEndpointWheel, { passive : false })
    }
    const current : HTMLDivElement | null = this.currentRef.current
    if (current !== null) {
      current.addEventListener('wheel', this.onEndpointWheel, { passive : false })
    }
  }

  componentDidMount () : void {
    this.syncHistoryEdges()
    this.attachWheelListeners()
  }

  componentWillUnmount () : void {
    const history : HTMLDivElement | null = this.historyRef.current
    if (history !== null) {
      history.removeEventListener('wheel', this.onHistoryWheel)
    }
    const initial : HTMLDivElement | null = this.initialRef.current
    if (initial !== null) {
      initial.removeEventListener('wheel', this.onEndpointWheel)
    }
    const current : HTMLDivElement | null = this.currentRef.current
    if (current !== null) {
      current.removeEventListener('wheel', this.onEndpointWheel)
    }
    if (this.edgeBumpTimer !== undefined) {
      window.clearTimeout(this.edgeBumpTimer)
    }
  }

  componentDidUpdate (prevProps : EvaluatorProps) : void {
    this.attachWheelListeners()

    // Follow the evaluation while the user is watching the tail;
    // stop following once they scroll up, resume at the bottom.
    if (prevProps.history.length !== this.props.history.length) {
      const el : HTMLDivElement | null = this.historyRef.current
      if (el !== null && this.followTail) {
        el.scrollTop = el.scrollHeight
      }
      this.edgeBump = 0
    }

    this.syncHistoryEdges()
  }

  // Forwards the wheel over the pinned endpoint steps into the
  // history: they read as history but sit outside its scroll
  // container, so without this the page moves instead. At either
  // true end the events flow through to the notebook untouched.
  onEndpointWheel (e : WheelEvent) : void {
    const el : HTMLDivElement | null = this.historyRef.current
    if (el === null || el.scrollHeight <= el.clientHeight + 1) {
      return
    }

    const unit : number = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1
    const deltaY : number = e.deltaY * unit
    if (Math.abs(deltaY) < Math.abs(e.deltaX)) {
      return
    }

    const atTop : boolean = el.scrollTop <= 1
    const atBottom : boolean = el.scrollHeight - el.scrollTop - el.clientHeight <= 1
    if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
      return
    }

    e.preventDefault()
    el.scrollTop += deltaY
  }

  // Swallows the first bit of outward scrolling at either end of the
  // history, making the ends feel sticky before the scroll chains out
  // to the notebook. preventDefault does the work: it stops both the
  // pane and the chain.
  onHistoryWheel (e : WheelEvent) : void {
    const el : HTMLDivElement | null = this.historyRef.current
    if (el === null) {
      return
    }

    const unit : number = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1
    const deltaY : number = e.deltaY * unit
    if (Math.abs(deltaY) < Math.abs(e.deltaX) || el.scrollHeight <= el.clientHeight + 1) {
      this.edgeBump = 0
      return
    }

    const atTop : boolean = el.scrollTop <= 1
    const atBottom : boolean = el.scrollHeight - el.scrollTop - el.clientHeight <= 1
    if (! ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom))) {
      this.edgeBump = 0
      return
    }

    if (this.edgeBumpTimer !== undefined) {
      window.clearTimeout(this.edgeBumpTimer)
    }
    this.edgeBumpTimer = window.setTimeout(() => {
      this.edgeBump = 0
      this.edgeBumpTimer = undefined
    }, EDGE_BUMP_RESET_MS)

    if (this.edgeBump < HISTORY_EDGE_BUMP_PX) {
      e.preventDefault()
      this.edgeBump += Math.abs(deltaY)
    }
  }

  // Tracks which end of the history is in view; drives the two gap
  // marks. The top edge is deliberately aggressive: anything more
  // than a few pixels down hides the very first step. Guarded so it
  // only re-renders on flips.
  syncHistoryEdges () : void {
    const el : HTMLDivElement | null = this.historyRef.current
    if (el === null) {
      return
    }

    const atBottom : boolean = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    const atTop : boolean = el.scrollTop <= 4
    this.followTail = atBottom
    if (atBottom !== this.state.historyAtBottom || atTop !== this.state.historyAtTop) {
      this.setState({ historyAtBottom : atBottom, historyAtTop : atTop })
    }
  }

  // Jump the history scroll down to the current form; the scroll
  // handler notices the bottom and fades the mark away.
  scrollHistoryToBottom () : void {
    const el : HTMLDivElement | null = this.historyRef.current
    if (el !== null) {
      el.scrollTo({ top : el.scrollHeight, behavior : 'smooth' })
    }
  }

  // Jump the history scroll back to the very first step; the scroll
  // handler notices the top and fades the mark away.
  scrollHistoryToTop () : void {
    const el : HTMLDivElement | null = this.historyRef.current
    if (el !== null) {
      el.scrollTo({ top : 0, behavior : 'smooth' })
    }
  }

  // Clone-this-step affordance shared by the initial, middle and
  // current renderings.
  renderCloneIcon (stepRecord : StepRecord) : JSX.Element {
    return (
      <span
        className="hiddenIcon"
        title='Clone this expression to the new box'
        onClick={ (e : any) => {
          e.stopPropagation()
          this.props.addBox(this.props.createBoxFrom(stepRecord))
        } }
      >
        <Copy size={ 13 } strokeWidth={ 1.75 } />
      </span>
    )
  }

  // Omission mark for one end of the history: a wave that swaps to a
  // column of chevrons on hover, jumping to that end on click. Mounted
  // only while middle steps exist to get disconnected; each end shows
  // only while scrolled away from it.
  renderGapMark (kind : 'top' | 'bottom') : JSX.Element | null {
    if (this.props.history.length <= 2) {
      return null
    }

    const up : boolean = kind === 'top'
    const visible : boolean = up ? ! this.state.historyAtTop : ! this.state.historyAtBottom
    const jump : () => void = up ? () => this.scrollHistoryToTop() : () => this.scrollHistoryToBottom()

    return (
      <div
        className={ `history-gap-indicator history-gap-indicator--${kind}${ visible ? ' visible' : '' }` }
        title={ up ? 'First steps are hidden - click to jump to the first step' : 'History is scrolled up - click to jump to the current form' }
        role='button'
        tabIndex={ visible ? 0 : -1 }
        onClick={ jump }
        onKeyDown={ (e : React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            jump()
          }
        } }
      >
        <svg className='gap-saw' width='52' height='12' viewBox='0 0 52 12' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M2 10 L8 2 L14 10 L20 2 L26 10 L32 2 L38 10 L44 2 L50 10' />
        </svg>
        <svg className='gap-arrows' width='12' height='20' viewBox='0 0 12 20' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
          { up ?
            <>
              <path d='M1 8 L6 3 L11 8' />
              <path d='M1 16 L6 11 L11 16' />
            </>
          :
            <>
              <path d='M1 4 L6 9 L11 4' />
              <path d='M1 12 L6 17 L11 12' />
            </>
          }
        </svg>
      </div>
    )
  }

  render () : JSX.Element {
    const { className, state, editor, isExercise } = this.props

    const { SDE, macrotable } : UntypedLambdaState = state
    const collapseOldSteps : boolean = state.collapseOldSteps ?? true

    const {
      placeholder,
      content,
      syntaxError,
    } = editor

    // this is just a dirty-quick implementation to get an unique identifier
    const array = new Uint32Array(2)
    window.crypto.getRandomValues(array)
    // const uniq : string = `${Date.now()}-${Math.random()}-${array[0]}-${array[1]}`



    return (
      <div className={ className }>
        {
          // The initial expression is pinned above the history like the
          // current form is pinned below it: endpoints always visible,
          // middle steps scroll between them.
          this.props.history.length >= 2 ?
            <div className='box-initial-step' ref={ this.initialRef }>
              <Step
                breakpoints={ this.props.breakpoints }
                strategy={ this.props.state.strategy }
                addBreakpoint={ () => {} }
                stepRecord={ this.props.history[0] }
                lastStep={ false }
                SDE={ SDE }
                macrotable={ macrotable }
              >
                { this.renderCloneIcon(this.props.history[0]) }
              </Step>
            </div>
          :
            null
        }
        <div className='box-history-wrap'>
        { this.renderGapMark('top') }
        <div
          className={ `box-history-scroll${ this.state.historyAtTop ? '' : ' mask-top' }${ this.state.historyAtBottom ? '' : ' mask-bottom' }` }
          ref={ this.historyRef }
          onScroll={ () => this.syncHistoryEdges() }
        >
        <ul className={ `UL${ collapseOldSteps ? ' collapse-history' : '' }` }>
          {
            this.props.history.length > 1 ?
              mapLeftFromTo(1, this.props.history.length - 2, this.props.history, (stepRecord : StepRecord, i : Number) =>
                <li key={ i.toString() } className='inactiveStep LI' tabIndex={ collapseOldSteps ? 0 : undefined } title={ collapseOldSteps ? 'Click to expand this step' : undefined } >
                  <Step
                    breakpoints={ this.props.breakpoints }
                    strategy={ this.props.state.strategy }
                    addBreakpoint={ () => {} }
                    stepRecord={ stepRecord }
                    lastStep={ false }
                    SDE={ SDE }
                    macrotable={ macrotable }
                  >
                    { this.renderCloneIcon(stepRecord) }
                  </Step>
                </li>)
            :
              null
          }
        </ul>
        </div>
        { this.renderGapMark('bottom') }
        </div>
        <div className='box-current-step activeStep' ref={ this.currentRef }>
          <Step
            breakpoints={ this.props.breakpoints }
            strategy={ this.props.state.strategy }
            addBreakpoint={ this.addBreakpoint }
            stepRecord={ this.props.history[this.props.history.length - 1] }
            lastStep={ true }
            SDE={ SDE }
            macrotable={ macrotable }
          >
            { this.renderCloneIcon(this.props.history[this.props.history.length - 1]) }
          </Step>
        </div>
        {
          (isExercise && ! this.props.isNormalForm) ?
            <div className='box-exercise-input'>
              <Editor
                placeholder={ placeholder }
                content={ content }
                syntaxError={ syntaxError }
                submitOnEnter={ true }

                onContent={ this.props.onContent }
                onEnter={ this.props.onEnter }
                onShiftEnter={ () => void 0 }
                onCtrlEnter={ () => void 0 }
                shouldReplaceLambda={ true }
              />
            </div>
          :
            null
        }
      </div>
    )
  }

  addBreakpoint (breakpoint : Breakpoint) : void {
    let { state, setBoxState, breakpoints } = this.props

    const brkpts : Array<Breakpoint> = breakpoints.filter((brk : Breakpoint) => {
      return brk.type !== breakpoint.type || brk.context.identifier !== breakpoint.context.identifier
    })

    if (brkpts.length !== breakpoints.length) {
      setBoxState({
        ...state,
        breakpoints : brkpts,
      })
    }
    else {
      setBoxState({
        ...state,
        breakpoints : [ ...breakpoints, breakpoint ]
      })
    }    
  }
}