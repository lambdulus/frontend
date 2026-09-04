 import React, { PureComponent } from 'react'

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
  constructor (props : EvaluatorProps) {
    super(props)

    this.addBreakpoint = this.addBreakpoint.bind(this)
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
                  <i
                    className="hiddenIcon far fa-clone"
                    title='Clone this expression to the new box'
                    onClick={ (e : any) => {
                      e.stopPropagation()
                      this.props.addBox(this.props.createBoxFrom(stepRecord))
                    } }
                  />
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
                <i
                  className="hiddenIcon far fa-clone"
                  title='Clone this expression to the new box'
                  onClick={ (e : any) => {
                    e.stopPropagation() // TODO: maybe I shouldn't do this
                    // maybe instead I should drop the `focusedBoxIndex` and stop caring if Box has been clicked
                    // instead I could always render whole and complete Box if user does not collapsed it
                    // I need to think this through
                    this.props.addBox(this.props.createBoxFrom(this.props.history[this.props.history.length - 1]))
                   } }
                />
            </Step>
          </li>
        </ul>
        {
          (isExercise && ! this.props.isNormalForm) ?
            <div>

              <Editor
                placeholder={ placeholder } // data
                content={ content } // data
                syntaxError={ syntaxError } // data
                submitOnEnter={ true } // data

                onContent={ this.props.onContent } // fn
                onEnter={ this.props.onEnter } // fn // tohle asi bude potreba
                onShiftEnter={ () => void 0 }
                onCtrlEnter={ () => void 0 }
                shouldReplaceLambda={ true }
              />

            </div>
          :
            ( ! this.props.isNormalForm && shouldShowDebugControls) ?
              <div style={ { height: '2.5em' } }>
                <span className='untyped-lambda--debug-ctrl'>
                  <DebugControls
                    isRunning={ isRunning }
                    onStep={ this.props.onEnter }
                    onRun={ this.props.onExecute }
                    // disableRun={ SDE }
                  />
                </span>
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