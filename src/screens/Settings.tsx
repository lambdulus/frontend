import React from 'react'

import UntypedLambdaCalculusSet, { defaultSettings as UntypedLambdaDefaultSettings } from '../untyped-lambda-integration/Settings'
import { CODE_NAME as UNTYPED_CODE_NAME, UntypedLambdaSettings, CODE_NAME } from '../untyped-lambda-integration/AppTypes'
import { NotebookState, Settings, GlobalSettings } from '../AppTypes'


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


export function updateSettingsInStorage (settings : GlobalSettings) : void {
  window.localStorage.setItem('global-settings', JSON.stringify(settings))
}


export function loadSettingsFromStorage () : GlobalSettings {
  const defaultSettings = {
    [UNTYPED_CODE_NAME] : {}
  }

  const serialized : string | null = window.localStorage.getItem('global-settings')
  const deserialized : GlobalSettings =  serialized === null ? defaultSettings : JSON.parse(serialized)

  
  for (const [key, value] of Object.entries(deserialized)) {
    switch (key) {
      case UNTYPED_CODE_NAME:
        deserialized[key] = { ...UntypedLambdaDefaultSettings, ...value }
        break;
    
      default:
        console.error("Settings CODE NAME is not one of known Code Names.")
        break;
    }
  }

  return deserialized
}