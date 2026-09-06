 import React, { PureComponent } from 'react'
import { Copy } from 'lucide-react'

import Step from './Step'
import { UntypedLambdaState, Breakpoint, StepRecord } from './Types'
import Editor from '../components/Editor'
import { mapLeftFromTo } from '../misc'
import DebugControls from '../components/DebugControls'

import './styles/Expression.css'

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
  private followTail : boolean

  constructor (props : EvaluatorProps) {
    super(props)

    this.historyRef = React.createRef<HTMLDivElement>()
    this.followTail = true
    this.state = { historyAtBottom : true, historyAtTop : true }
    this.addBreakpoint = this.addBreakpoint.bind(this)
  }

  componentDidMount () : void {
    this.syncHistoryEdges()
  }

  componentDidUpdate (prevProps : EvaluatorProps) : void {
    // Follow the evaluation while the user is watching the tail;
    // stop following once they scroll up, resume at the bottom.
    if (prevProps.history.length !== this.props.history.length) {
      const el : HTMLDivElement | null = this.historyRef.current
      if (el !== null && this.followTail) {
        el.scrollTop = el.scrollHeight
      }
    }

    this.syncHistoryEdges()
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
        <svg className='gap-wave' width='12' height='20' viewBox='0 0 12 20' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
          <path d='M6 1 Q10 5 6 9 Q2 13 6 17' />
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
    const { className, state, editor, shouldShowDebugControls, isExercise } = this.props

    const { isRunning, SDE, macrotable } : UntypedLambdaState = state
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
        <div className='box-eval-controls'>
          {
            ( ! isExercise && ! this.props.isNormalForm && shouldShowDebugControls) ?
              <DebugControls
                isRunning={ isRunning }
                onStep={ this.props.onEnter }
                onRun={ this.props.onExecute }
              />
            :
              null
          }
        </div>
        {
          // The initial expression is pinned above the history like the
          // current form is pinned below it: endpoints always visible,
          // middle steps scroll between them.
          this.props.history.length >= 2 ?
            <div className='box-initial-step'>
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
        <div className='box-current-step activeStep'>
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