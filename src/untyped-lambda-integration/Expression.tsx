 import React, { PureComponent, ReactNode, ChangeEvent } from 'react'

// import Controls from './Controls' // TODO: Controls are gonna be imported from the Frontend app - or maybe not even imported just passed as children
import Step from './Step'
import { UntypedLambdaState, Breakpoint, StepRecord, UntypedLambdaExpressionState, EvaluationStrategy } from './Types'
import Editor from '../components/Editor'
// import { DeleteBox } from './BoxSpace'
// import { AddBoxContext } from './MethodInjector'
import { mapLeftFromTo } from '../misc'
import DebugControls from '../components/DebugControls'
// import BoxTopBar from './BoxTopBar'
// import Controls from './ExerciseSwitch'

import './styles/Expression.css'
import { MacroMap } from '@lambdulus/core'


interface EvaluatorProps {
  className : string
  state : UntypedLambdaExpressionState
  breakpoints : Array<Breakpoint>
  history : Array<StepRecord>
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
  isNormalForm : boolean
  isExercise : boolean

  createBoxFrom (stepRecord : StepRecord) : UntypedLambdaState
  setBoxState (state : UntypedLambdaExpressionState) : void
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
    const { className, state, editor, shouldShowDebugControls, isExercise, setBoxState } = this.props

    const { isRunning, strategy, SDE, macrotable } : UntypedLambdaExpressionState = state

    const {
      placeholder,
      content,
      caretPosition,
      syntaxError,
    } = editor

    const uniq : string = Date.now().toString()


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
                onExecute={ this.props.onExecute } // fn // tohle asi bude potreba
                shouldReplaceLambda={ true }
              />


              <div className='untyped-lambda--pick-strategy untyped-lambda-settings-strategies inlineblock'>
                <p className='stratsLabel inlineblock'>Strategy:</p>
                
                {/* <span className='untyped-lambda-settings--strategy-radio-wrapper'>
                  <input
                    id={ `untyped-lambda-settings--simplified-strategy-${uniq}` }
                    type='radio'
                    name={ `untyped-lambda-settings--strategy-${uniq}` }
                    // style="fill"
                    checked={
                      strategy === EvaluationStrategy.ABSTRACTION
                    }
                    
                    onChange={
                      () => setBoxState({ ...state, strategy : EvaluationStrategy.ABSTRACTION })
                    }
                  />
                  <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--simplified-strategy-${uniq}` }>
                    Simplified
                  </label>
                </span> */}

                <span className='untyped-lambda-settings--strategy-radio-wrapper'>
                  <input
                    id={ `untyped-lambda-settings--normal-strategy-${uniq}` }
                    type='radio'
                    name={ `untyped-lambda-settings--strategy-${uniq}` }
                    // style="fill"
                    checked={
                      strategy === EvaluationStrategy.NORMAL
                    }

                    onChange={
                      () => setBoxState({ ...state, strategy : EvaluationStrategy.NORMAL })
                    }
                  />
                  <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--normal-strategy-${uniq}` }>
                    Normal
                  </label>
                </span>

                <span className='untyped-lambda-settings--strategy-radio-wrapper'>
                  <input
                    id={ `untyped-lambda-settings--applicative-strategy-${uniq}` }
                    type='radio'
                    name={ `untyped-lambda-settings--strategy-${uniq}` }
                    // style="fill"
                    checked={
                      strategy === EvaluationStrategy.APPLICATIVE
                    }
                    
                    onChange={
                      () => setBoxState({ ...state, strategy : EvaluationStrategy.APPLICATIVE })
                    }
                  />
                  <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--applicative-strategy-${uniq}` }>
                    Applicative
                  </label>
                </span>
              </div>
            </div>
          :
            ( ! this.props.isNormalForm && shouldShowDebugControls) ?
              <div>
                <span className='untyped-lambda--debug-ctrl'>
                  <DebugControls
                    isRunning={ isRunning }
                    onStep={ this.props.onEnter }
                    onRun={ this.props.onExecute }
                  />
                </span>
                
                <div className='untyped-lambda--pick-strategy untyped-lambda-settings-strategies inlineblock'>
                  <p className='stratsLabel inlineblock'>Strategy:</p>
                  
                  {/* <span className='untyped-lambda-settings--strategy-radio-wrapper'>
                    <input
                      id={ `untyped-lambda-settings--simplified-strategy-${uniq}` }
                      type='radio'
                      name={ `untyped-lambda-settings--strategy-${uniq}` }
                      // style="fill"
                      checked={
                        strategy === EvaluationStrategy.ABSTRACTION
                      }
                      
                      onChange={
                        () => setBoxState({ ...state, strategy : EvaluationStrategy.ABSTRACTION })
                      }
                    />
                    <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--simplified-strategy-${uniq}` }>
                      Simplified
                    </label>
                  </span> */}

                  <span className='untyped-lambda-settings--strategy-radio-wrapper'>
                    <input
                      id={ `untyped-lambda-settings--normal-strategy-${uniq}` }
                      type='radio'
                      name={ `untyped-lambda-settings--strategy-${uniq}` }
                      // style="fill"
                      checked={
                        strategy === EvaluationStrategy.NORMAL
                      }

                      onChange={
                        () => setBoxState({ ...state, strategy : EvaluationStrategy.NORMAL })
                      }
                    />
                    <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--normal-strategy-${uniq}` }>
                      Normal
                    </label>
                  </span>

                  <span className='untyped-lambda-settings--strategy-radio-wrapper'>
                    <input
                      id={ `untyped-lambda-settings--applicative-strategy-${uniq}` }
                      type='radio'
                      name={ `untyped-lambda-settings--strategy-${uniq}` }
                      // style="fill"
                      checked={
                        strategy === EvaluationStrategy.APPLICATIVE
                      }
                      
                      onChange={
                        () => setBoxState({ ...state, strategy : EvaluationStrategy.APPLICATIVE })
                      }
                    />
                    <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--applicative-strategy-${uniq}` }>
                      Applicative
                    </label>
                  </span>
                </div>

                {/* Here add SDE switch/checkbox */}
                {
                  <span
                    className='untyped-lambda-settings-SDE-'
                    title='Simplified Evaluation'>
                    <input
                      id={ `untyped-lambda-settings--SDE-${uniq}` }
                      type='checkbox'
                      checked={ SDE }
                      disabled={ false }
                      // shape="fill"
                      
                      onChange={
                        (e : ChangeEvent<HTMLInputElement>) => // tady nejakej destructuring
                          setBoxState({ ...state, SDE : e.target.checked })
                      }
                    />
                    <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--SDE-${uniq}` }>
                      Simplified Evaluation
                    </label>
                  </span>
                }

              </div>
            :
              null
        }
      </div>
    )
  }

  addBreakpoint (breakpoint : Breakpoint) : void {
    let { state, setBoxState, breakpoints } = this.props
  
    // const index : number = breakpoints.findIndex((brk : Breakpoint) => {
    //   return brk.type === breakpoint.type && brk.context.identifier === breakpoint.context.identifier
    // })
    // 
    // if (index >= 0) {
    //   breakpoints.splice(index, 1)
    // }
    // else {
    //   breakpoints.push(breakpoint)
    // }
    // 
    // setBoxState({
    //   ...state,
    //   breakpoints,
    // })

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