import React, { useContext, ReactNode, ChangeEvent } from 'react'

import Editor from '../components/Editor'
// import { MakeActiveContext, DeleteBox } from './BoxSpace'
import { StepRecord, UntypedLambdaExpressionState, EvaluationStrategy } from './Types'

import './styles/EmptyExpression.css'

interface EmptyExpressionProps {
  className : string
  isActive : boolean
  isMinimized : boolean
  state : UntypedLambdaExpressionState
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
  // history : Array<StepRecord>

  onContent (content : string) : void
  onDebug () : void
  onExercise () : void
  setBoxState (box : UntypedLambdaExpressionState) : void
}


export default function EmptyExpression(props : EmptyExpressionProps) : JSX.Element{
  const { className, isActive, editor, isMinimized, setBoxState, state } = props
  const {
    placeholder,
    content,
    caretPosition,
    syntaxError,
  } = editor
  const { SDE, strategy, SLI } = state

  // this is just a dirty-quick implementation to get an unique identifier
  const array = new Uint32Array(2)
  window.crypto.getRandomValues(array)
  const uniq : string = `${Date.now()}-${Math.random()}-${array[0]}-${array[1]}`

  // const makeActive = useContext(MakeActiveContext)
  // const deleteBox = useContext(DeleteBox)

  return (
    <div
      className={ `${className} ${isActive ? '' : ' inactiveBox'}` }
    >
      {
        ! isMinimized ?
          (
            <div>
              <Editor
                placeholder={ placeholder } // data
                content={ content } // data
                syntaxError={ syntaxError } // data
                submitOnEnter={ false } // data
                shouldReplaceLambda={ true }

                onContent={ props.onContent } // fn
                onEnter={ () => void 0 } // fn
                onCtrlEnter={ props.onDebug }
                onShiftEnter={ props.onExercise }
                onExecute={ () => void 0 } // fn
              />

              <div className='debug-controls'>
                <button
                  title='Debug this Expression in the Evaluator (Ctrl + Enter)'
                  type="button"
                  className='open-as-debug btn'
                  onClick={ props.onDebug }
                >
                  <span
                    className='untyped-lambda--submit-expression--btn-label'
                  >
                    Debug
                  </span>
                </button>
                
                {
                  // SDE ? /* TODO: this is just for now -- because I am not sure students will know how to exercise with simplified */
                    // null
                  // :
                  <button
                    title='Exercise this Expression Yourself (Shift + Enter)'
                    type="button"
                    className='open-as-exercise btn'
                    onClick={ props.onExercise }
                  >
                    <span className='untyped-lambda--submit-expression--btn-label'>Exercise</span>
                  </button>
                }
                
              </div>
            </div>
          )
          :
          (
            <div>
              <p className='inactiveMessage'>
                Collapsing Empty Expression Box. Click to activate this box.
              </p>
            </div>
          )
      }


      <div
        className='untyped-lambda--pick-strategy untyped-lambda-settings-strategies inlineblock'
        style={ { height: '2.5em' } }
      >
        <p className='stratsLabel inlineblock'>Strategy:</p>
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

      <span
        className='untyped-lambda-settings-SLI-'
        title='Single Letters as Names without Spaces'>
        <input
          id={ `untyped-lambda-settings--SLI-${uniq}` }
          type='checkbox'
          checked={ SLI }
          disabled={ false } // TODO: tohle bude rozhodne chtit prepsat
          // shape="fill"
          
          onChange={
            (e : ChangeEvent<HTMLInputElement>) => // tady nejakej destructuring
              setBoxState({ ...state, SLI : e.target.checked })
          }
        />
        <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--SLI-${uniq}` }>
          Single Letter Names
        </label>
      </span>
  </div>
  )
}