import React, { ChangeEvent, useState } from 'react'
import { Bug, Download, Eraser, Moon, Settings as SettingsIcon, Sun, Upload } from 'lucide-react'

import { AppState, GlobalSettings, Screen, NotebookState } from '../Types'

import '../styles/TopBar.css'
import { decodeNotebook } from '../Constants'
import { Theme } from '../contexts/Theme'
import UntypedLambdaCalculusSet from '../untyped-lambda-integration/Settings'
import {
  CODE_NAME as UNTYPED_CODE_NAME,
  GLOBAL_SETTINGS_ENABLER as UNTYPED_GLOBAL_SETTINGS_ENABLER,
} from '../untyped-lambda-integration/Constants'
import { UntypedLambdaSettings } from '../untyped-lambda-integration/Types'


interface Props {
  state : AppState
  onImport (notebook : NotebookState) : void
  onClearWorkspace () : void
  onScreenChange (screen : Screen) : void
  onDarkModeChange () : void
  onSettingsChange (settings : GlobalSettings) : void
}

export default function TopBar (props : Props) : JSX.Element {
  const { state, onImport, onClearWorkspace, onScreenChange, onDarkModeChange, onSettingsChange } : Props = props
  const { notebook : ntbk, currentScreen, theme } : AppState = state
  const { settings } = ntbk

  const [ settingsOpen, setSettingsOpen ] = useState(false)

  const darkmode : boolean = theme === Theme.Dark

  const serialized : string = JSON.stringify(ntbk)
  const link : string = createURL(serialized)

  const untypedSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaSettings

  return (
    <div className='top-bar'>
      <div className='top-bar--inner'>
        <div
          className='top-bar--brand'
          title='Back to the Notebook'
          onClick={ () => onScreenChange(Screen.MAIN) }
        >
          <span className='top-bar--logo'>λ</span>
          <span className='top-bar--name'>Lambdulus</span>
        </div>

        <nav className='top-bar--tabs'>
          <button
            className={ currentScreen === Screen.MAIN ? 'top-bar--tab top-bar--tab--active' : 'top-bar--tab' }
            onClick={ () => onScreenChange(Screen.MAIN) }
          >
            Notebook
          </button>
          <button
            className={ currentScreen === Screen.HELP ? 'top-bar--tab top-bar--tab--active' : 'top-bar--tab' }
            onClick={ () => onScreenChange(Screen.HELP) }
          >
            Manual
          </button>
        </nav>

        <div className='top-bar--actions'>
          <a
            className='top-bar--action'
            href={ link }
            download="notebook_lambdulus.lus"
            title='Download this Notebook'
          >
            <Download size={ 17 } strokeWidth={ 1.75 } />
          </a>

          <input type="file" accept=".lus" id="input"
            onChange={ (e) => onFiles(e, onImport) }
          />
          <label htmlFor="input" className='top-bar--action' title='Import a Notebook from your computer'>
            <Upload size={ 17 } strokeWidth={ 1.75 } />
          </label>

          <button
            className='top-bar--action'
            title='Clear the whole workspace'
            onClick={ onClearWorkspace }
          >
            <Eraser size={ 17 } strokeWidth={ 1.75 } />
          </button>

          <button
            className='top-bar--action'
            title='Toggle the theme'
            onClick={ onDarkModeChange }
          >
            { darkmode ? <Sun size={ 17 } strokeWidth={ 1.75 } /> : <Moon size={ 17 } strokeWidth={ 1.75 } /> }
          </button>

          <button
            className={ settingsOpen ? 'top-bar--action top-bar--action--active' : 'top-bar--action' }
            title='Notebook settings'
            onClick={ () => setSettingsOpen(! settingsOpen) }
          >
            <SettingsIcon size={ 17 } strokeWidth={ 1.75 } />
          </button>

          <a
            className='top-bar--action'
            title='Submit a bug or a feature request'
            target="_blank"
            rel="noopener noreferrer"
            href='https://github.com/lambdulus/frontend/issues'
          >
            <Bug size={ 17 } strokeWidth={ 1.75 } />
          </a>
        </div>

        {
          settingsOpen ?
            <React.Fragment>
              <div className='top-bar--backdrop' onClick={ () => setSettingsOpen(false) } />
              <div className='top-bar--settings-panel'>
                <p className='top-bar--settings-title'>Notebook settings</p>
                <UntypedLambdaCalculusSet
                  settings={ untypedSettings }
                  settingsEnabled={ UNTYPED_GLOBAL_SETTINGS_ENABLER }
                  change={
                    (unTypLSet : UntypedLambdaSettings) => {
                      onSettingsChange({ ...settings, [UNTYPED_CODE_NAME] : unTypLSet })
                    }
                  }
                />
              </div>
            </React.Fragment>
          :
            null
        }
      </div>
    </div>
  )
}

function onFiles (event : ChangeEvent<HTMLInputElement>, onImport : (notebook : NotebookState) => void) : void {
  const { target : { files } } = event
  if (files === null) {
    return
  }

  const file : File = files[0]
  const reader : FileReader = new FileReader()
  reader.onload = (event : Event) => {
    const notebook : NotebookState = JSON.parse(reader.result as string)

    onImport(decodeNotebook(notebook))
  }

  reader.readAsText(file) 
}

function createURL (content : string) : string {
  const data = new Blob([ content ], {
    type: 'application/json'
  })

  return window.URL.createObjectURL(data);
}
