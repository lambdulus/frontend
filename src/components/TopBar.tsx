import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { Bug, Download, Eraser, Lock, Moon, Plus, Settings as SettingsIcon, Sun, Upload, X } from 'lucide-react'

import { GlobalSettings, NotebookState } from '../Types'

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
  notebooks : Array<NotebookState>
  activeNotebookIndex : number
  theme : Theme
  settings : GlobalSettings
  onNotebookSelect (index : number) : void
  onNotebookAdd () : void
  onNotebookRemove (index : number) : void
  onImport (notebook : NotebookState) : void
  onClearNotebook () : void
  onDarkModeChange () : void
  onSettingsChange (settings : GlobalSettings) : void
}

export default function TopBar (props : Props) : JSX.Element {
  const {
    notebooks,
    activeNotebookIndex,
    theme,
    settings,
    onNotebookSelect,
    onNotebookAdd,
    onNotebookRemove,
    onImport,
    onClearNotebook,
    onDarkModeChange,
    onSettingsChange,
  } : Props = props

  const [ settingsOpen, setSettingsOpen ] = useState(false)
  const tabsRef = useRef<HTMLElement>(null)

  // Keep the active tab visible when switching or adding notebooks.
  useEffect(() => {
    tabsRef.current
      ?.querySelector('.top-bar--tab--active')
      ?.scrollIntoView?.({ inline : 'nearest', block : 'nearest' })
  }, [ activeNotebookIndex, notebooks.length ])

  const darkmode : boolean = theme === Theme.Dark
  const notebook : NotebookState = notebooks[activeNotebookIndex]

  // Exported notebooks are always ordinary ones: protection stays with
  // the workspace instead of travelling inside the .lus file.
  const exportable : NotebookState = {
    ...notebook,
    locked : false,
    boxList : notebook.boxList.map((box) => ({ ...box, readOnly : false })),
  }
  const serialized : string = JSON.stringify(exportable)
  const link : string = createURL(serialized)
  const fileName : string = `${ notebook.name.replace(/[^\w\- ]+/g, '').trim() || 'notebook' }.lus`

  const untypedSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaSettings

  return (
    <div className='top-bar'>
      <div className='top-bar--inner'>
        <div
          className='top-bar--brand'
          title='Lambdulus'
        >
          <span className='top-bar--logo'>λ</span>
        </div>

        <nav className='top-bar--tabs' ref={ tabsRef }>
          {
            notebooks.map((tab : NotebookState, i : number) =>
              <span
                key={ tab.__key }
                className={ i === activeNotebookIndex ? 'top-bar--tab top-bar--tab--active' : 'top-bar--tab' }
                onClick={ (e) => {
                  onNotebookSelect(i)
                  e.currentTarget.scrollIntoView?.({ inline : 'nearest', block : 'nearest' })
                } }
              >
                <span className='top-bar--tab-name'>
                  { tab.name }
                </span>
                {
                  tab.locked ?
                    <Lock size={ 12 } strokeWidth={ 1.75 } />
                  :
                    <span
                      className='top-bar--tab-close'
                      title='Close this notebook'
                      onClick={ (e) => {
                        e.stopPropagation()
                        onNotebookRemove(i)
                      } }
                    >
                      <X size={ 13 } strokeWidth={ 1.75 } />
                    </span>
                }
              </span>
            )
          }
        </nav>
        <button
          className='top-bar--action'
          title='New notebook'
          onClick={ onNotebookAdd }
        >
          <Plus size={ 17 } strokeWidth={ 1.75 } />
        </button>

        <div className='top-bar--actions'>
          <a
            className='top-bar--action'
            href={ link }
            download={ fileName }
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
            title={ notebook.locked ? 'The Manual notebook cannot be cleared' : 'Clear this notebook' }
            disabled={ notebook.locked }
            onClick={ onClearNotebook }
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
