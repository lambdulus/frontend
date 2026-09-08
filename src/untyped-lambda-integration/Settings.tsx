import React, { ChangeEvent, useRef } from 'react'
import { UntypedLambdaSettings, EvaluationStrategy, SettingsEnabled } from './Types'

import './styles/Settings.css'


interface Props {
  settings : UntypedLambdaSettings
  settingsEnabled : SettingsEnabled

  change : (settings : UntypedLambdaSettings) => void
}

export default function Settings (props : Props) : JSX.Element {
  const { settings, change, settingsEnabled } : Props = props
  const { SLI, expandStandalones, strategy, SDE, ETA, collapseOldSteps } : UntypedLambdaSettings = settings
  const { SLI : SLI_E, expandStandalones : expSt_E, strategy : strat_E } : SettingsEnabled = settingsEnabled


  // Stable per panel instance: regenerating ids every render remounts
  // the inputs in effect, steals focus, and makes the browser scroll
  // the toggled control into view on every change.
  const uniqRef = useRef<string | null>(null)
  if (uniqRef.current === null) {
    const array = new Uint32Array(2)
    window.crypto.getRandomValues(array)
    uniqRef.current = `${Date.now()}-${Math.random()}-${array[0]}-${array[1]}`
  }
  const uniq : string = uniqRef.current

  return (
    <div className='untyped-lambda-box--settings'>
      {
        SLI_E ?
          <span
            className='untyped-lambda-settings-SLI'
            title='Single Letters as Names without Spaces'>
            <input
              id={ `untyped-lambda-settings--SLI-${uniq}` }
              type='checkbox'
              checked={ SLI }
              disabled={ false } // TODO: tohle bude rozhodne chtit prepsat
              // shape="fill"
              
              onChange={
                (e : ChangeEvent<HTMLInputElement>) => // tady nejakej destructuring
                  change({ ...settings, SLI : e.target.checked })
              }
            />
            <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--SLI-${uniq}` }>
              Single Letter Names
            </label>
          </span>
        :
          null
      }

      {
        <span
          className='untyped-lambda-settings-SDE'
          title='Simplified Evaluation'>
          <input
            id={ `untyped-lambda-settings--SDE-${uniq}` }
            type='checkbox'
            checked={ SDE }
            disabled={ false }
            // shape="fill"
            
            onChange={
              (e : ChangeEvent<HTMLInputElement>) => // tady nejakej destructuring
                change({ ...settings, SDE : e.target.checked })
            }
          />
          <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--SDE-${uniq}` }>
            Simplified Evaluation
          </label>
        </span>
      }

      {
        <span
          className='untyped-lambda-settings-ETA'
          title='Convert trailing eta-redexes at the end of evaluation'>
          <input
            id={ `untyped-lambda-settings--ETA-${uniq}` }
            type='checkbox'
            checked={ ETA ?? false }
            disabled={ false }

            onChange={
              (e : ChangeEvent<HTMLInputElement>) =>
                change({ ...settings, ETA : e.target.checked })
            }
          />
          <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--ETA-${uniq}` }>
            Eta Conversion
          </label>
        </span>
      }

      {
        <span
          className='untyped-lambda-settings-collapse'
          title='Shorten older reduction steps, click one to expand it'>
          <input
            id={ `untyped-lambda-settings--collapse-${uniq}` }
            type='checkbox'
            checked={ collapseOldSteps ?? true }
            disabled={ false }

            onChange={
              (e : ChangeEvent<HTMLInputElement>) =>
                change({ ...settings, collapseOldSteps : e.target.checked })
            }
          />
          <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--collapse-${uniq}` }>
            Collapse Old Steps
          </label>
        </span>
      }

      {
        expSt_E && false ? // hiding this out - I am not sure what this should be in the first place
          <span
            className='untyped-lambda-settings-expand'
            title='Expand Numbers and Macros at the End'>
            <input
              id={ `untyped-lambda-settings--expand-${uniq}` }
              type='checkbox'
              checked={ expandStandalones }
              disabled={ false } // TODO: tohle bude rozhodne chtit prepsat
              
              onChange={
                (e : ChangeEvent<HTMLInputElement>) => {
                  // tady nejakej destructuring
                  change({ ...settings, expandStandalones : e.target.checked })
                }
              }
            />
            <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--expand-${uniq}` }>
              Expand Macros and Numbers at the End
            </label>
          </span>
        :
          null
      }

      {
        strat_E ?
          <div className='untyped-lambda-settings-strategies'>
            <p className='stratsLabel'>Evaluation Strategies:</p>

            <span className='untyped-lambda-settings--strategy-seg'>
            <span className='untyped-lambda-settings--strategy-radio-wrapper'>
              <input
                id={ `untyped-lambda-settings--normal-strategy-${uniq}` }
                type='radio'
                name={ `untyped-lambda-settings--strategy-${uniq}` }
                checked={
                  strategy === EvaluationStrategy.NORMAL
                }

                onChange={
                  () => change({ ...settings, strategy : EvaluationStrategy.NORMAL })
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
                checked={
                  strategy === EvaluationStrategy.APPLICATIVE
                }
                
                onChange={
                  () => change({ ...settings, strategy : EvaluationStrategy.APPLICATIVE })
                }
              />
              <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--applicative-strategy-${uniq}` }>
                Applicative
              </label>
            </span>
            </span>
          </div>
        :
          null
    }
    </div>
  )
}