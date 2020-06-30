 import React, { PureComponent, ReactNode } from 'react'

// import Controls from './Controls' // TODO: Controls are gonna be imported from the Frontend app - or maybe not even imported just passed as children
import Step from './Step'
import { PromptPlaceholder, UntypedLambdaState, Breakpoint, StepRecord } from './AppTypes'
import Editor from '../components/Editor'
// import { DeleteBox } from './BoxSpace'
// import { AddBoxContext } from './MethodInjector'
import { mapLeftFromTo } from '../misc'
// import BoxTopBar from './BoxTopBar'
// import Controls from './ExerciseSwitch'


interface EvaluatorProps {
  className : string
  isExercise : boolean
  state : UntypedLambdaState
  breakpoints : Array<Breakpoint>
  history : Array<StepRecord>
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
  isNormalForm : boolean

  createBoxFrom (stepRecord : StepRecord) : UntypedLambdaState
  setBoxState (state : UntypedLambdaState) : void
  onContent (content : string, caretPosition : number) : void
  onEnter () : void
  onExecute () : void
  addBox (box : UntypedLambdaState) : void
}

export default class Expression extends PureComponent<EvaluatorProps> {
  constructor (props : EvaluatorProps) {
    super(props)

    this.addBreakpoint = this.addBreakpoint.bind(this)
  }

  render () : JSX.Element {
    const { className, isExercise, state, editor } = this.props

    const {
      placeholder,
      content,
      caretPosition,
      syntaxError,
    } = editor

    return (
      <div className={ className }>
        <ul className='UL'>
          {
            mapLeftFromTo(0, this.props.history.length - 2, this.props.history, (stepRecord : StepRecord, i : Number) =>
              <li key={ i.toString() } className='inactiveStep LI' >
                <Step
                  breakpoints={ this.props.breakpoints }
                  addBreakpoint={ () => {} }
                  stepRecord={ stepRecord }
                  lastStep={ false }
                >
                  <i
                    className="hiddenIcon far fa-clone"
                    title='Clone this expression to the new box'
                    onClick={ (e : any) => {
                      e.preventDefault()
                      this.props.addBox(this.props.createBoxFrom(stepRecord))
                    } }
                  />
                </Step>
              </li>)
          }
          <li key={this.props.history.length - 1} className='activeStep LI'>
            <Step
              breakpoints={ this.props.breakpoints }
              addBreakpoint={ this.addBreakpoint }
              stepRecord={ this.props.history[this.props.history.length - 1] }
              lastStep={ true }
            >
                <i
                  className="hiddenIcon far fa-clone"
                  title='Clone this expression to the new box'
                  onClick={ (e : any) => {
                    e.preventDefault() // TODO: maybe I shouldn't do this
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
          this.props.isNormalForm ?
          null
            :
          <Editor
            placeholder={ placeholder } // data
            content={ content } // data
            caretPosition={ caretPosition } // data
            syntaxError={ syntaxError } // data
            submitOnEnter={ true } // data

            onContent={ this.props.onContent } // fn
            onEnter={ this.props.onEnter } // fn // tohle asi bude potreba
            onExecute={ this.props.onExecute } // fn // tohle asi bude potreba
          />
        }
      </div>
    )
  }

  addBreakpoint (breakpoint : Breakpoint) : void {
    let { state, setBoxState } = this.props
  
    setBoxState({
      ...state,
      breakpoints : [ ...state.breakpoints, breakpoint ],
    })
  }
}