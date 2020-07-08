import React, { ChangeEvent } from 'react'
import { UntypedLambdaSettings, EvaluationStrategy, SettingsEnabled } from './Types'

import './styles/Settings.css'

// const { Switch, Radio } = require('pretty-checkbox-react')


interface Props {
  settings : UntypedLambdaSettings
  settingsEnabled : SettingsEnabled

  change : (settings : UntypedLambdaSettings) => void
}

export default function Settings (props : Props) : JSX.Element {
  const { settings, change, settingsEnabled } : Props = props
  const { SLI, expandStandalones, strategy } : UntypedLambdaSettings = settings
  const { SLI : SLI_E, expandStandalones : expSt_E, strategy : strat_E } : SettingsEnabled = settingsEnabled

  const uniq : string = Date.now().toString()

  return (
    <div className='untyped-lambda-box--settings'>
      {/* <h3>Untyped Lambda Calculus</h3> */}

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
        expSt_E ?
          <span
            className='untyped-lambda-settings-expand'
            title='Expand Numbers and Macros at the End'>
            <input
              id={ `untyped-lambda-settings--expand-${uniq}` }
              type='checkbox'
              checked={ expandStandalones }
              disabled={ false } // TODO: tohle bude rozhodne chtit prepsat
              // shape="fill"
              
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
          <div className='untyped-lambda-settings-strategies inlineblock'>
            <p className='stratsLabel inlineblock'>Evaluation Strategies:</p>
            <span className='untyped-lambda-settings--strategy-radio-wrapper'>
              <input
                id={ `untyped-lambda-settings--simplified-strategy-${uniq}` }
                type='radio'
                name={ `untyped-lambda-settings--strategy-${uniq}` }
                // style="fill"
                checked={
                  strategy === EvaluationStrategy.ABSTRACTION
                }
                
                onChange={
                  () => change({ ...settings, strategy : EvaluationStrategy.ABSTRACTION })
                }
              />
              <label className='untyped-lambda-settings-label' htmlFor={ `untyped-lambda-settings--simplified-strategy-${uniq}` }>
                Simplified
              </label>
            </span>

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
                // style="fill"
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
          </div>
        :
          null
    }
    </div>
  )
}