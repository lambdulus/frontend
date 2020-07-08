import React from 'react'

import { BoxState, BoxType } from '../Types'
import { UntypedLambdaState, UntypedLambdaType, UntypedLambdaExpressionState, UntypedLambdaMacroState, UntypedLambdaSettings } from './Types'
import ExpressionBox from './ExpressionBox'
import Macro from './Macro'
import MacroList from './MacroList'
import { UNTYPED_LAMBDA_INTEGRATION_STATE, GLOBAL_SETTINGS_ENABLER, MACRO_SETTINGS_ENABLER } from './AppTypes'
import ExerciseBox from './ExerciseBox'
import Settings from './Settings'

// import macroctx from './MacroContext'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
}

export default function UntypedLambdaBox (props : Props) : JSX.Element {
  const { state, setBoxState } : Props = props
  const { settingsOpen, subtype, macrolistOpen, SLI, expandStandalones, strategy } : UntypedLambdaState = state

  const getSettingsEnabler = () => {
    switch (subtype) {
      case UntypedLambdaType.ORDINARY: {
        return GLOBAL_SETTINGS_ENABLER
      }
  
      case UntypedLambdaType.EXERCISE: {
        return GLOBAL_SETTINGS_ENABLER
      }

      case UntypedLambdaType.MACRO: {
        return MACRO_SETTINGS_ENABLER
      }
    }
  }

  const renderBox = () => {
    switch (subtype) {
      case UntypedLambdaType.ORDINARY: {
        const exprState : UntypedLambdaExpressionState = state as UntypedLambdaExpressionState
        return <ExpressionBox { ...props } state={ exprState } macroContext={ UNTYPED_LAMBDA_INTEGRATION_STATE } />
      }
  
      case UntypedLambdaType.EXERCISE: {
        const execState : UntypedLambdaExpressionState = state as UntypedLambdaExpressionState
        return <ExerciseBox { ...props } state={ execState } macroContext={ UNTYPED_LAMBDA_INTEGRATION_STATE } />
      }

      case UntypedLambdaType.MACRO: {
        const macroState : UntypedLambdaMacroState = state as UntypedLambdaMacroState
        return <Macro { ...props } state={ macroState} macroContext={ UNTYPED_LAMBDA_INTEGRATION_STATE } />
      }
    }
  }

  return (
    <div>
      {
        settingsOpen ?
          <div className='box-settings'>
            Box Local Settings:
            <Settings
              settings={ { type : BoxType.UNTYPED_LAMBDA, SLI, expandStandalones, strategy } }
              settingsEnabled={ getSettingsEnabler() }

              change={ (settings : UntypedLambdaSettings) => {
                setBoxState({
                  ...state,
                  ...settings
                })
              } }
            />
          </div>
        :
          null
      }
      {
        macrolistOpen ?
          <div className='untyped-lambda-box--macrolist'>
            <MacroList macroTable={ state.macrotable }  />
            {/* // TODO: this will just get this? */}
          </div>
        :
          null
      }

      { renderBox() }

    </div>
  )
}