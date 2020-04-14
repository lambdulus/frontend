 import React, { PureComponent, ReactNode } from 'react'

// import Controls from './Controls' // TODO: Controls are gonna be imported from the Frontend app - or maybe not even imported just passed as children
import Step from './Step'
import { BoxState } from '../AppTypes'
import { PromptPlaceholder, UntypedLambdaState, Breakpoint, StepRecord } from './AppTypes'
import Editor from './Editor'
// import { DeleteBox } from './BoxSpace'
// import { AddBoxContext } from './MethodInjector'
import { mapLeftFromTo } from '../misc'
import BoxTopBar from './BoxTopBar'
import Controls from './ExerciseSwitch'


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
        <Controls
          isExercise={ isExercise }
          makeExercise={ () =>
            this.props.setBoxState({
              ...state,
              isExercise : true,
              editor: {
                ...state.editor,
                placeholder : PromptPlaceholder.VALIDATE_MODE,
              },
            })
          }
          endExercise={ () =>
            this.props.setBoxState({
              ...state,
              isExercise : false,
              editor: {
                ...state.editor,
                placeholder : PromptPlaceholder.EVAL_MODE,
              },
            })
          }
        />
        {/* <DeleteBox.Consumer>
          {
           (deleteBox : () => void) => */}
            {/* <i className='removeBox far fa-trash-alt' onClick={ deleteBox } title='Remove this Box' /> */}
        {/*   }
         </DeleteBox.Consumer>
          */}

        {/* <AddBoxContext.Consumer>
          {
            (addBox : (boxState : BoxState) => void) => */}
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
                        className="hiddenIcon fas fa-pencil-alt"
                        title='Copy this to new box'
                        onClick={ () => this.props.addBox(this.props.createBoxFrom(stepRecord)) }
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
                      className="hiddenIcon fas fa-pencil-alt"
                      title='Copy this to new box'
                      onClick={ () => this.props.addBox(this.props.createBoxFrom(this.props.history[this.props.history.length - 1])) }
                    />
                </Step>
              </li>
            </ul>
          {/* }
        </AddBoxContext.Consumer> */}

        {
          this.props.isNormalForm ?
          null
            :
          <Editor
            placeholder={ placeholder } // data
            content={ content } // data
            caretPosition={ caretPosition } // data
            syntaxError={ syntaxError } // data
            isMarkDown={ false } // data

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