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

export default class Expression extends PureComponent<EvaluatorProps> {
  private historyRef : React.RefObject<HTMLDivElement>
  private followTail : boolean

  constructor (props : EvaluatorProps) {
    super(props)

    this.historyRef = React.createRef<HTMLDivElement>()
    this.followTail = true
    this.addBreakpoint = this.addBreakpoint.bind(this)
  }

  componentDidUpdate (prevProps : EvaluatorProps) : void {
    // Follow the evaluation while the user is watching the tail;
    // stop following once they scroll up, resume at the bottom.
    if (prevProps.history.length === this.props.history.length) {
      return
    }

    const el : HTMLDivElement | null = this.historyRef.current
    if (el === null || ! this.followTail) {
      return
    }

    el.scrollTop = el.scrollHeight
  }

  render () : JSX.Element {
    const { className, state, editor, shouldShowDebugControls, isExercise } = this.props

    const { isRunning, SDE, macrotable } : UntypedLambdaState = state

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
            (isExercise && ! this.props.isNormalForm) ?
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
            :
              ( ! this.props.isNormalForm && shouldShowDebugControls) ?
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
          onScroll={ (e) => {
            const el : HTMLDivElement = e.currentTarget
            this.followTail = el.scrollHeight - el.scrollTop - el.clientHeight < 40
          } }
        >
        <ul className='UL'>
          {
            mapLeftFromTo(0, this.props.history.length - 2, this.props.history, (stepRecord : StepRecord, i : Number) =>
              <li key={ i.toString() } className='inactiveStep LI' >
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
          <li key={this.props.history.length - 1} className='activeStep LI'>
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
          </li>
        </ul>
        </div>
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