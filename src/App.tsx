import React, { Component } from 'react'

import './App.css'

import  { loadAppStateFromStorage
        , updateAppStateToStorage
        , updateNotebookStateToStorage
        , CLEAR_NOTEBOOK_CONFIRMATION
        , createEmptyNotebook } from './Constants'

import TopBar from './components/TopBar'
import Notebook from './screens/Notebook'
import { AppState, NotebookState, GlobalSettings, BoxType, BoxState } from './Types'
import { CODE_NAME as UNTYPED_LAMBDA_CODE_NAME, createNewUntypedLambdaBoxFromSource, defaultSettings } from './untyped-lambda-integration/Constants'
import { UntypedLambdaState, UntypedLambdaSettings, EvaluationStrategy, UntypedLambdaType } from './untyped-lambda-integration/Types'
import { MacroTable } from '@lambdulus/core'
import { Theme, ThemeContext } from './contexts/Theme'
import { SettingsContext } from './contexts/Settings'


export default class App extends Component<{}, AppState> {
  constructor (props : {}) {
    super(props)

    console.log(`VERSION: ${import.meta.env.VITE_VERSION_INFO}`)
    console.log(`COMMIT: ${import.meta.env.VITE_COMMIT}`)


    this.state = loadAppStateFromStorage()

    this.updateNotebook = this.updateNotebook.bind(this)
    this.updateSettings = this.updateSettings.bind(this)
    this.importNotebook = this.importNotebook.bind(this)
    this.clearNotebook = this.clearNotebook.bind(this)
    this.toggleTheme = this.toggleTheme.bind(this)
    this.selectNotebook = this.selectNotebook.bind(this)
    this.addNotebook = this.addNotebook.bind(this)
    this.renameNotebook = this.renameNotebook.bind(this)
    this.removeNotebook = this.removeNotebook.bind(this)

    this.createNotebookFromURL = this.createNotebookFromURL.bind(this)
  }

  componentDidMount () : void {
    this.createNotebookFromURL()
  }

  // TODO: all of this needs to be moved to more apropriate component

  // I don't think it should get moved to the component, standalone helper function would be OK
  // OR -> split it --> there will be very simple top level abstraction implementation
  // and according the type of the BOX - specific Integration Module will handle the actual deserialization
  createNotebookFromURL () {
    const urlSearchParams : URLSearchParams = new URL(window.location.toString()).searchParams
    const type : string | null = urlSearchParams.get('type')

    if (type === null) {
      return
    }

    switch (type) {
      case BoxType.UNTYPED_LAMBDA: {
        const source : string | null = urlSearchParams.get('source')
        const macros : string | null = urlSearchParams.get('macros')
        const subtype : string | null = urlSearchParams.get('subtype')
        const strategy : string | null = urlSearchParams.get('strategy')
        const SDE : string | null = urlSearchParams.get('SDE')
        const SLI : string | null = urlSearchParams.get('SLI')
        
        if (source === null || macros == null || subtype === null || strategy === null || SDE === null || SLI === null) {
          return
        }

        const strat : EvaluationStrategy = EvaluationStrategy.NORMAL === strategy ? EvaluationStrategy.NORMAL : EvaluationStrategy.APPLICATIVE

        const sli : boolean = SLI === 'true' ? true : false

        const settings : UntypedLambdaSettings = { ...defaultSettings, strategy : strat, SDE : SDE === 'true' ? true : false, SLI : sli }

        const sub : UntypedLambdaType = subtype === UntypedLambdaType.EMPTY ?
            UntypedLambdaType.EMPTY
          :
            subtype === UntypedLambdaType.ORDINARY ?
              UntypedLambdaType.ORDINARY
            :
              subtype === UntypedLambdaType.EXERCISE ?
                UntypedLambdaType.EXERCISE
              :
                UntypedLambdaType.EMPTY

        try {
          const macrotable : MacroTable = JSON.parse(decodeURI(macros))

          const box : UntypedLambdaState = createNewUntypedLambdaBoxFromSource(decodeURI(source), settings, sub, macrotable)
          const notebook : NotebookState = createNewNotebookWithBox('Shared', box, { [UNTYPED_LAMBDA_CODE_NAME] : settings })
          const notebooks : Array<NotebookState> = [ ...this.state.notebooks, notebook ]

          this.setState({
            notebooks,
            activeNotebookIndex : notebooks.length - 1,
          })

          window.history.pushState(null, '', '/') // TODO: decide if remove or leave

          updateAppStateToStorage({
            ...this.state,
            notebooks,
            activeNotebookIndex : notebooks.length - 1,
          })
        }
        catch (ex) {
          window.history.replaceState(null, '', '/') // TODO: decide if remove or leave
        }
      }
      break
        
      default:
        break;
    }
  }

  // NOTE: render is OK
  render () {
    const { notebooks, activeNotebookIndex, theme } = this.state
    const notebook : NotebookState = notebooks[activeNotebookIndex]
    const { settings } = notebook

    const darkmode = theme === Theme.Dark

    return (
      <ThemeContext.Provider value={ theme }>
        <SettingsContext.Provider value={ settings }>

          <div id='app' className={ darkmode ? 'dark' : 'light' }>
            <div id="bad-screen-message">
              Lambdulus only runs on screens at least 900 pixels wide.
            </div>
            <TopBar
              notebooks={ notebooks }
              activeNotebookIndex={ activeNotebookIndex }
              theme={ theme }
              settings={ settings }
              onNotebookSelect={ this.selectNotebook }
              onNotebookAdd={ this.addNotebook }
              onNotebookRename={ this.renameNotebook }
              onNotebookRemove={ this.removeNotebook }
              onImport={ this.importNotebook }
              onClearNotebook={ this.clearNotebook }
              onDarkModeChange={ this.toggleTheme }
              onSettingsChange={ this.updateSettings }
            />

            <Notebook state={ notebook } updateNotebook={ this.updateNotebook } />
          </div>

        </SettingsContext.Provider>
      </ThemeContext.Provider>
    )
  }

  updateNotebook (notebookPatch : Partial<NotebookState>) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const newNotebook = { ...notebooks[activeNotebookIndex], ...notebookPatch }
    const newNotebooks = [ ...notebooks ]
    newNotebooks[activeNotebookIndex] = newNotebook

    this.setState({ notebooks : newNotebooks })

    updateNotebookStateToStorage(activeNotebookIndex, newNotebook)
  }

  importNotebook (notebook : NotebookState) : void {
    const notebooks : Array<NotebookState> = [ ...this.state.notebooks, notebook ]

    this.setState({
      notebooks,
      activeNotebookIndex : notebooks.length - 1,
    })

    updateAppStateToStorage({
      ...this.state,
      notebooks,
      activeNotebookIndex : notebooks.length - 1,
    })
  }

  updateSettings (newSettings : GlobalSettings) : void {
    const { notebooks, activeNotebookIndex } = this.state
    const newNotebook = { ...notebooks[activeNotebookIndex], settings : newSettings }
    const newNotebooks = [ ...notebooks ]
    newNotebooks[activeNotebookIndex] = newNotebook


    this.setState({ notebooks : newNotebooks })
    updateNotebookStateToStorage(activeNotebookIndex, newNotebook)
  }

  clearNotebook () : void {
    const { notebooks, activeNotebookIndex } = this.state
    const notebook : NotebookState = notebooks[activeNotebookIndex]

    if (notebook.locked) {
      return
    }

    if (window.confirm(CLEAR_NOTEBOOK_CONFIRMATION)) {
      const cleared : NotebookState = {
        ...notebook,
        boxList : [],
        activeBoxIndex : NaN,
        focusedBoxIndex : undefined,
      }
      const newNotebooks = [ ...notebooks ]
      newNotebooks[activeNotebookIndex] = cleared

      this.setState({ notebooks : newNotebooks })
      updateNotebookStateToStorage(activeNotebookIndex, cleared)
    }
  }

  selectNotebook (index : number) : void {
    const { notebooks } = this.state

    if (index < 0 || index >= notebooks.length) {
      return
    }

    this.setState({ activeNotebookIndex : index })

    updateAppStateToStorage({
      ...this.state,
      activeNotebookIndex : index,
    })
  }

  addNotebook () : void {
    const { notebooks } = this.state
    const names = notebooks.map((notebook : NotebookState) => notebook.name)

    let name : string = 'Notebook'
    let counter : number = 2
    while (names.indexOf(name) !== -1) {
      name = `Notebook ${counter}`
      counter++
    }

    const newNotebooks = [ ...notebooks, createEmptyNotebook(name) ]

    this.setState({
      notebooks : newNotebooks,
      activeNotebookIndex : newNotebooks.length - 1,
    })

    updateAppStateToStorage({
      ...this.state,
      notebooks : newNotebooks,
      activeNotebookIndex : newNotebooks.length - 1,
    })
  }

  renameNotebook (index : number, name : string) : void {
    const { notebooks } = this.state
    const trimmed : string = name.trim()

    if (index < 0 || index >= notebooks.length || trimmed.length === 0) {
      return
    }

    const newNotebooks = [ ...notebooks ]
    newNotebooks[index] = { ...newNotebooks[index], name : trimmed }

    this.setState({ notebooks : newNotebooks })

    updateAppStateToStorage({
      ...this.state,
      notebooks : newNotebooks,
    })
  }

  removeNotebook (index : number) : void {
    const { notebooks, activeNotebookIndex } = this.state

    if (index < 0 || index >= notebooks.length || notebooks[index].locked) {
      return
    }

    let newNotebooks : Array<NotebookState> = notebooks.filter((notebook : NotebookState, i : number) => i !== index)
    if (newNotebooks.length === 0) {
      newNotebooks = [ createEmptyNotebook('Notebook') ]
    }

    const newActiveIndex : number =
      index < activeNotebookIndex ? activeNotebookIndex - 1
      : index === activeNotebookIndex ? Math.min(index, newNotebooks.length - 1)
      : activeNotebookIndex

    this.setState({
      notebooks : newNotebooks,
      activeNotebookIndex : newActiveIndex,
    })

    updateAppStateToStorage({
      ...this.state,
      notebooks : newNotebooks,
      activeNotebookIndex : newActiveIndex,
    })
  }

  toggleTheme () : void {
    const { theme } = this.state
    const opposite = theme === Theme.Dark ? Theme.Light : Theme.Dark

    this.setState({ theme : opposite })
    updateAppStateToStorage({ ...this.state, theme : opposite })
  }

}

function createNewNotebookWithBox (name : string, box : BoxState, settings : GlobalSettings) : NotebookState {
  return {
    name,
    boxList : [ box ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    settings,

    menuOpen : false,

    __key : Date.now().toString(),
  }
}