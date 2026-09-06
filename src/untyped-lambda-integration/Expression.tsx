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
}

export default class Expression extends PureComponent<EvaluatorProps, ExpressionState> {
  private historyRef : React.RefObject<HTMLDivElement>
  private followTail : boolean

  constructor (props : EvaluatorProps) {
    super(props)

    this.historyRef = React.createRef<HTMLDivElement>()
    this.followTail = true
    this.state = { historyAtBottom : true }
    this.addBreakpoint = this.addBreakpoint.bind(this)
  }

  componentDidMount () : void {
    this.syncHistoryBottom()
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

    this.syncHistoryBottom()
  }

  // Tracks whether the history scroll shows the steps right before the
  // current form; drives the gap indicator. Guarded so it only
  // re-renders on flips.
  syncHistoryBottom () : void {
    const el : HTMLDivElement | null = this.historyRef.current
    if (el === null) {
      return
    }

    const atBottom : boolean = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    this.followTail = atBottom
    if (atBottom !== this.state.historyAtBottom) {
      this.setState({ historyAtBottom : atBottom })
    }
  }

  // Jump the history scroll down to the current form; the scroll
  // handler notices the bottom and fades the indicator away.
  scrollHistoryToBottom () : void {
    const el : HTMLDivElement | null = this.historyRef.current
    if (el !== null) {
      el.scrollTo({ top : el.scrollHeight, behavior : 'smooth' })
    }
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
        <div
          className='box-history-scroll'
          ref={ this.historyRef }
          onScroll={ () => this.syncHistoryBottom() }
        >
        <ul className={ `UL${ collapseOldSteps ? ' collapse-history' : '' }` }>
          {
            mapLeftFromTo(0, this.props.history.length - 2, this.props.history, (stepRecord : StepRecord, i : Number) =>
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
                </Step>
              </li>)
          }
        </ul>
        </div>
        {
          // Omission marker between the scrolled history and the pinned
          // current form; only visible while the history does not reach
          // the steps right before it.
          this.props.history.length > 1 ?
            <div
              className={ `history-gap-indicator${ this.state.historyAtBottom ? '' : ' visible' }` }
              title='History is scrolled up - click to jump to the current form'
              role='button'
              tabIndex={ 0 }
              onClick={ () => this.scrollHistoryToBottom() }
              onKeyDown={ (e : React.KeyboardEvent<HTMLDivElement>) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  this.scrollHistoryToBottom()
                }
              } }
            >
              <svg className='gap-wave' width='12' height='30' viewBox='0 0 12 30' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round'>
                <path d='M6 1 Q10 5 6 9 Q2 13 6 17 Q10 21 6 25 Q4 27.5 6 29' />
              </svg>
              <svg className='gap-chevron' width='12' height='10' viewBox='0 0 12 10' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                <path d='M1 2 L6 8 L11 2' />
              </svg>
            </div>
          :
            null
        }
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
              <span
                className="hiddenIcon"
                title='Clone this expression to the new box'
                onClick={ (e : any) => {
                  e.stopPropagation() // TODO: maybe I shouldn't do this
                  // maybe instead I should drop the `focusedBoxIndex` and stop caring if Box has been clicked
                  // instead I could always render whole and complete Box if user does not collapsed it
                  // I need to think this through
                  this.props.addBox(this.props.createBoxFrom(this.props.history[this.props.history.length - 1]))
                 } }
                >
                  <Copy size={ 13 } strokeWidth={ 1.75 } />
                </span>
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