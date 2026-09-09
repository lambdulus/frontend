import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Bug, Download, Eraser, Focus, Footprints, Lock, Moon, Palette, Plus, Settings as SettingsIcon, Sun, Upload, X } from 'lucide-react'

import { Accent, BoxStyle, GlobalSettings, NotebookState } from '../Types'

import '../styles/TopBar.css'
import { decodeNotebook } from '../Constants'
import { Theme } from '../contexts/Theme'
import UntypedLambdaCalculusSet from '../untyped-lambda-integration/Settings'
import {
  CODE_NAME as UNTYPED_CODE_NAME,
  GLOBAL_SETTINGS_ENABLER as UNTYPED_GLOBAL_SETTINGS_ENABLER,
  defaultSettings as UNTYPED_DEFAULT_SETTINGS,
} from '../untyped-lambda-integration/Constants'
import { UntypedLambdaSettings } from '../untyped-lambda-integration/Types'


interface Props {
  notebooks : Array<NotebookState>
  activeNotebookIndex : number
  theme : Theme
  accent : Accent
  boxStyle : BoxStyle
  confirmBoxDelete : boolean
  settings : GlobalSettings
  onAccentChange (accent : Accent) : void
  onAccentPreview (accent : Accent | null) : void
  onBoxStyleChange (boxStyle : BoxStyle) : void
  onBoxStylePreview (boxStyle : BoxStyle | null) : void
  onConfirmBoxDeleteChange (confirm : boolean) : void
  onNotebookSelect (index : number) : void
  onNotebookAdd () : void
  onNotebookRemove (index : number) : void
  onImport (notebook : NotebookState) : void
  onClearNotebook () : void
  onResetWorkspace () : void
  onDarkModeChange () : void
  onSettingsChange (settings : GlobalSettings) : void
  onZenModeChange (zenMode : boolean) : void
  onTourOpen () : void
}

export default function TopBar (props : Props) : JSX.Element {
  const {
    notebooks,
    activeNotebookIndex,
    theme,
    accent,
    boxStyle,
    confirmBoxDelete,
    settings,
    onAccentChange,
    onAccentPreview,
    onBoxStyleChange,
    onBoxStylePreview,
    onConfirmBoxDeleteChange,
    onNotebookSelect,
    onNotebookAdd,
    onNotebookRemove,
    onImport,
    onClearNotebook,
    onResetWorkspace,
    onDarkModeChange,
    onSettingsChange,
    onZenModeChange,
    onTourOpen,
  } : Props = props

  // A single open panel: switching icons swaps popovers in one click
  // instead of closing first and forgetting the click.
  const [ openPanel, setOpenPanel ] = useState<'settings' | 'clear' | 'themes' | null>(null)
  const togglePanel = (panel : 'settings' | 'clear' | 'themes') => {
    if (openPanel === panel) {
      setOpenPanel(null)
      // Closing panels drops any stuck hover preview with them.
      onAccentPreview(null)
      onBoxStylePreview(null)
    }
    else {
      setOpenPanel(panel)
    }
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

  // Settings-less notebooks (years-old storage) fall back to the defaults
  // instead of crashing the panel open, same as the box picker modal.
  const untypedSettings : UntypedLambdaSettings = (settings[UNTYPED_CODE_NAME] as UntypedLambdaSettings | undefined) ?? UNTYPED_DEFAULT_SETTINGS

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

          <button
            className='top-bar--action'
            title='Guided tour'
            onClick={ () => {
              setOpenPanel(null)
              onTourOpen()
            } }
          >
            <Footprints size={ 17 } strokeWidth={ 1.75 } />
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
                <p className='top-bar--settings-title'>Deletion</p>
                <span className='top-bar--delete-confirm'>
                  <input
                    id='top-bar--confirm-delete'
                    type='checkbox'
                    checked={ confirmBoxDelete }
                    onChange={ (e) => onConfirmBoxDeleteChange(e.target.checked) }
                  />
                  <label htmlFor='top-bar--confirm-delete'>
                    Confirm before deleting a box
                  </label>
                </span>
              </div>
            </React.Fragment>
          :
            null
        }

        {
          openPanel === 'themes' ?
            <React.Fragment>
              <div className='top-bar--backdrop' onClick={ () => {
                setOpenPanel(null)
                onAccentPreview(null)
                onBoxStylePreview(null)
              } } />
              <div className='top-bar--settings-panel'>
                <p className='top-bar--settings-title'>Accent theme</p>
                { /* Hovering or keyboard-focusing an option previews its
                     theme site-wide; leaving the row without picking
                     falls back to the committed accent. Picking never
                     closes the popup, same as the box style picker. */ }
                <div
                  className='top-bar--accent-pick'
                  onMouseLeave={ () => onAccentPreview(null) }
                  onBlur={ (e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      onAccentPreview(null)
                    }
                  } }
                >
                  {
                    ([
                      { value : 'emerald' as Accent, label : 'Beta', glyph : 'β' },
                      { value : 'blue' as Accent, label : 'Lambda', glyph : 'λ' },
                      { value : 'indigo' as Accent, label : 'Eta', glyph : 'η' },
                      { value : 'amber' as Accent, label : 'Alpha', glyph : 'α' },
                    ]).map((option) =>
                      <span
                        className='top-bar--accent-option'
                        key={ option.value }
                        onMouseEnter={ () => onAccentPreview(option.value) }
                      >
                        <input
                          id={ `top-bar--accent-${option.value}` }
                          type='radio'
                          name='top-bar--accent'
                          checked={ accent === option.value }
                          onChange={ () => onAccentChange(option.value) }
                          onFocus={ () => onAccentPreview(option.value) }
                        />
                        <label className='top-bar--accent-choice' htmlFor={ `top-bar--accent-${option.value}` }>
                          <span className={ `top-bar--accent-dot top-bar--theme-swatch--${option.value}` } aria-hidden='true'>
                            <span className='top-bar--accent-glyph'>{ option.glyph }</span>
                          </span>
                          <span className='top-bar--accent-caption'>{ option.label }</span>
                        </label>
                      </span>
                    )
                  }
                </div>
                <p className='top-bar--settings-title'>Box style</p>
                { /* Same preview contract as the accent row above:
                     hover or focus previews, leaving without picking
                     falls back, picking never closes the popup. */ }
                <div
                  className='top-bar--boxpreview'
                  onMouseLeave={ () => onBoxStylePreview(null) }
                  onBlur={ (e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      onBoxStylePreview(null)
                    }
                  } }
                >
                  {
                    ([
                      { value : 'cards' as BoxStyle, label : 'Cards' },
                      { value : 'classic' as BoxStyle, label : 'Classic' },
                    ]).map((option) =>
                      <span
                        className='top-bar--boxpreview-option'
                        key={ option.value }
                        onMouseEnter={ () => onBoxStylePreview(option.value) }
                      >
                        <input
                          id={ `top-bar--boxstyle-${option.value}` }
                          type='radio'
                          name='top-bar--boxstyle'
                          checked={ boxStyle === option.value }
                          onChange={ () => onBoxStyleChange(option.value) }
                          onFocus={ () => onBoxStylePreview(option.value) }
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
