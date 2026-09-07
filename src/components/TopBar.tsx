import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Bug, Check, Download, Eraser, Focus, Lock, Moon, Palette, Plus, Settings as SettingsIcon, Sun, Upload, X } from 'lucide-react'

import { Accent, BoxStyle, GlobalSettings, NotebookState } from '../Types'

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
  accent : Accent
  boxStyle : BoxStyle
  settings : GlobalSettings
  onAccentChange (accent : Accent) : void
  onBoxStyleChange (boxStyle : BoxStyle) : void
  onNotebookSelect (index : number) : void
  onNotebookAdd () : void
  onNotebookRemove (index : number) : void
  onImport (notebook : NotebookState) : void
  onClearNotebook () : void
  onResetWorkspace () : void
  onDarkModeChange () : void
  onSettingsChange (settings : GlobalSettings) : void
  onZenModeChange (zenMode : boolean) : void
}

export default function TopBar (props : Props) : JSX.Element {
  const {
    notebooks,
    activeNotebookIndex,
    theme,
    accent,
    boxStyle,
    settings,
    onAccentChange,
    onBoxStyleChange,
    onNotebookSelect,
    onNotebookAdd,
    onNotebookRemove,
    onImport,
    onClearNotebook,
    onResetWorkspace,
    onDarkModeChange,
    onSettingsChange,
    onZenModeChange,
  } : Props = props

  // A single open panel: switching icons swaps popovers in one click
  // instead of closing first and forgetting the click.
  const [ openPanel, setOpenPanel ] = useState<'settings' | 'clear' | 'themes' | null>(null)
  const togglePanel = (panel : 'settings' | 'clear' | 'themes') => {
    setOpenPanel(openPanel === panel ? null : panel)
  }
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
  // Memoized: a fresh blob URL per render would leak the previous one.
  const link : string = useMemo(() => createURL(serialized), [ serialized ])
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
            className={ openPanel === 'clear' ? 'top-bar--action top-bar--action--active' : 'top-bar--action' }
            title='Clearing options'
            onClick={ () => togglePanel('clear') }
          >
            <Eraser size={ 17 } strokeWidth={ 1.75 } />
          </button>

          <button
            className='top-bar--action top-bar--theme-toggle'
            title='Toggle the theme'
            onClick={ onDarkModeChange }
          >
            { darkmode ? <Sun size={ 17 } strokeWidth={ 1.75 } /> : <Moon size={ 17 } strokeWidth={ 1.75 } /> }
          </button>

          <button
            role='switch'
            aria-checked={ notebook.zenMode === true }
            className={ notebook.zenMode === true ? 'top-bar--zen top-bar--zen--on' : 'top-bar--zen' }
            title={ notebook.zenMode === true ? 'Exit zen mode: show all boxes' : 'Zen mode: one box at a time' }
            onClick={ () => onZenModeChange(notebook.zenMode !== true) }
          >
            <span className='top-bar--zen-knob'>
              <Focus size={ 13 } strokeWidth={ 2 } />
            </span>
          </button>

          <button
            className={ openPanel === 'settings' ? 'top-bar--action top-bar--action--active' : 'top-bar--action' }
            title='Notebook settings'
            onClick={ () => togglePanel('settings') }
          >
            <SettingsIcon size={ 17 } strokeWidth={ 1.75 } />
          </button>

          <button
            className={ openPanel === 'themes' ? 'top-bar--action top-bar--action--active' : 'top-bar--action' }
            title='Accent theme'
            onClick={ () => togglePanel('themes') }
          >
            <Palette size={ 17 } strokeWidth={ 1.75 } />
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
          openPanel === 'settings' ?
            <React.Fragment>
              <div className='top-bar--backdrop' onClick={ () => setOpenPanel(null) } />
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

        {
          openPanel === 'themes' ?
            <React.Fragment>
              <div className='top-bar--backdrop' onClick={ () => setOpenPanel(null) } />
              <div className='top-bar--settings-panel'>
                <p className='top-bar--settings-title'>Accent theme</p>
                {
                  ([
                    { value : 'emerald' as Accent, label : 'Beta emerald' },
                    { value : 'blue' as Accent, label : 'Lambda blue' },
                    { value : 'amber' as Accent, label : 'Gamma amber' },
                  ]).map((option) =>
                    <button
                      key={ option.value }
                      className={ `btn top-bar--theme-btn top-bar--theme-btn--${option.value}${accent === option.value ? ' top-bar--theme-btn--active' : ''}` }
                      onClick={ () => {
                        onAccentChange(option.value)
                        setOpenPanel(null)
                      } }
                    >
                      <span className={ `top-bar--theme-swatch top-bar--theme-swatch--${option.value}` } />
                      { option.label }
                      { accent === option.value ? <Check size={ 14 } strokeWidth={ 2 } /> : null }
                    </button>
                  )
                }
                <p className='top-bar--settings-title'>Box style</p>
                <div className='top-bar--boxpreview'>
                  {
                    ([
                      { value : 'cards' as BoxStyle, label : 'Cards' },
                      { value : 'classic' as BoxStyle, label : 'Classic' },
                    ]).map((option) =>
                      <span className='top-bar--boxpreview-option' key={ option.value }>
                        <input
                          id={ `top-bar--boxstyle-${option.value}` }
                          type='radio'
                          name='top-bar--boxstyle'
                          checked={ boxStyle === option.value }
                          onChange={ () => onBoxStyleChange(option.value) }
                        />
                        <label className='top-bar--boxpreview-tile' htmlFor={ `top-bar--boxstyle-${option.value}` }>
                          <span className={ `top-bar--boxpreview-art top-bar--boxpreview-art--${option.value}` } aria-hidden='true'>
                            <span className='top-bar--boxpreview-bar top-bar--boxpreview-bar--long' />
                            <span className='top-bar--boxpreview-bar top-bar--boxpreview-bar--short' />
                          </span>
                          <span className='top-bar--boxpreview-caption'>{ option.label }</span>
                        </label>
                      </span>
                    )
                  }
                </div>
              </div>
            </React.Fragment>
          :
            null
        }

        {
          openPanel === 'clear' ?
            <React.Fragment>
              <div className='top-bar--backdrop' onClick={ () => setOpenPanel(null) } />
              <div className='top-bar--settings-panel'>
                <p className='top-bar--settings-title'>Clearing options</p>
                <button
                  className='btn top-bar--clear-btn'
                  title={ notebook.locked ? 'The Manual notebook cannot be cleared' : `Erase all boxes in ${notebook.name}` }
                  disabled={ notebook.locked }
                  onClick={ () => {
                    setOpenPanel(null)
                    onClearNotebook()
                  } }
                >
                  Clear notebook { notebook.name }
                </button>
                <div className='top-bar--clear-divider' />
                <button
                  className='btn btn-danger top-bar--clear-btn'
                  title='Erase all notebooks and start over with the defaults'
                  onClick={ () => {
                    setOpenPanel(null)
                    onResetWorkspace()
                  } }
                >
                  Clean entire workspace
                </button>
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
