import React from 'react'

import UntypedLambdaCalculusSet from '../untyped-lambda-integration/Settings'
import { CODE_NAME as UNTYPED_CODE_NAME, UntypedLambdaSettings } from '../untyped-lambda-integration/AppTypes'
import { GlobalSettings } from '../AppTypes'


interface Props {
  settings : GlobalSettings
  updateSettings : (settings : GlobalSettings) => void
}

export default function SettingsScreen (props : Props) : JSX.Element {
  const { settings, updateSettings } = props

  const untypedSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaSettings

  return (
    <div className='settingsSpace'>
      <UntypedLambdaCalculusSet
        settings={ untypedSettings }
        change={
          (unTypLSet : UntypedLambdaSettings) =>
            updateSettings({ ...settings, [UNTYPED_CODE_NAME] : unTypLSet })
        }
      />
    </div>
  )
}