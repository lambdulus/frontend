import React, { useContext } from 'react'

import UntypedLambdaCalculusSet from '../untyped-lambda-integration/Settings'
import {
  CODE_NAME as UNTYPED_CODE_NAME,
  GLOBAL_SETTINGS_ENABLER as UNTYPED_GLOBAL_SETTINGS_ENABLER
} from '../untyped-lambda-integration/Constants'
import { GlobalSettings } from '../Types'
import { UntypedLambdaSettings } from '../untyped-lambda-integration/Types'
import { SettingsContext } from '../contexts/Settings'


interface Props {
  updateSettings : (settings : GlobalSettings) => void
}

export default function SettingsScreen (props : Props) : JSX.Element {
  const { updateSettings } = props
  const settings = useContext(SettingsContext)
  const untypedSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaSettings

  return (
    <div className='settingsSpace'>
      <h2>
        Settings for Untyped Lambda Calculus:
      </h2>
      <UntypedLambdaCalculusSet
        settings={ untypedSettings }
        settingsEnabled={ UNTYPED_GLOBAL_SETTINGS_ENABLER }
        change={
          (unTypLSet : UntypedLambdaSettings) => {
            console.log("updating settings", unTypLSet)
            updateSettings({ ...settings, [UNTYPED_CODE_NAME] : unTypLSet })
          }
        }
      />
    </div>
  )
}