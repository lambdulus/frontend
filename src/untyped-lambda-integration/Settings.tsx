import React, { ChangeEvent } from 'react'
import { UntypedLambdaSettings, EvaluationStrategy } from './AppTypes'

const { Switch, Radio } = require('pretty-checkbox-react')


interface Props {
  settings : UntypedLambdaSettings
  change : (settings : UntypedLambdaSettings) => void
}

export default function Settings (props : Props) : JSX.Element {
  const { settings, change } : Props = props
  const { SLI, expandStandalones, strategy } : UntypedLambdaSettings = settings

  return (
    <div className='untypedLambdaSettings'>
      <h3>Untyped Lambda Calculus</h3>


      <span title='Letters as names without spaces'>
        <Switch
          checked={ SLI }
          disabled={ false } // TODO: tohle bude rozhodne chtit prepsat
          shape="fill"
          
          onChange={
             (e : ChangeEvent<HTMLInputElement>) => // tady nejakej destructuring
              change({ ...settings, SLI : e.target.checked })
          }
        >
          Single Letter Names
        </Switch>
      </span>

      <br></br>
      <br></br>

      <span title='Expand stand-alones'>
        <Switch
          checked={ expandStandalones }
          disabled={ false } // TODO: tohle bude rozhodne chtit prepsat
          shape="fill"
          
          onChange={
            (e : ChangeEvent<HTMLInputElement>) => // tady nejakej destructuring
              change({ ...settings, expandStandalones : e.target.checked })
          }
        >
          Expand stand-alones
        </Switch>
      </span>

      <br></br>
      <br></br>

      <div className='strategies inlineblock'>
        <p className='stratsLabel inlineblock'>Evaluation Strategies:</p>
        <Radio
          name="strategy"
          style="fill"
          checked={
            strategy === EvaluationStrategy.ABSTRACTION
          }
          
          onChange={
            () => change({ ...settings, strategy : EvaluationStrategy.ABSTRACTION })
          }
        >
          Simplified
        </Radio>
        <Radio
          name="strategy"
          style="fill"
          checked={
            strategy === EvaluationStrategy.NORMAL
          }
          
          onChange={
            () => change({ ...settings, strategy : EvaluationStrategy.NORMAL })
          }
        >
          Normal
        </Radio>
        <Radio
          name="strategy"
          style="fill"
          checked={
            strategy === EvaluationStrategy.APPLICATIVE
          }
          
          onChange={
            () => change({ ...settings, strategy : EvaluationStrategy.APPLICATIVE })
          }
        >
          Applicative
        </Radio>
      </div>
    </div>
  )
}