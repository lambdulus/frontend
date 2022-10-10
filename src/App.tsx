import React, { Component } from 'react'

import './App.css'

import  { updateSettingsInStorage
        , loadAppStateFromStorage
        , updateAppStateToStorage
        , updateNotebookStateToStorage
        , CLEAR_WORKSPACE_CONFIRMATION
        , loadSettingsFromStorage
        , InitNotebookState } from './Constants'

import TopBar from './components/TopBar'
import MenuBar from './components/MenuBar'
import Notebook from './screens/Notebook'
import Help from './screens/Help'
import SettingsScreen from './screens/Settings'
import { Screen, AppState, NotebookState, GlobalSettings, BoxType, BoxState } from './Types'
import { createNewUntypedLambdaBoxFromSource, defaultSettings } from './untyped-lambda-integration/AppTypes'
import { UntypedLambdaState, UntypedLambdaSettings, EvaluationStrategy, UntypedLambdaType } from './untyped-lambda-integration/Types'
import { MacroTable } from '@lambdulus/core'
import { Theme, ThemeContext } from './contexts/Theme'


export default class App extends Component<{}, AppState> {
  constructor (props : {}) {
    super(props)

    console.log(`VERSION: ${process.env.REACT_APP_VERSION_INFO}`)
    console.log(`COMMIT: ${process.env.REACT_APP_COMMIT}`)


    this.state = loadAppStateFromStorage()

    this.setScreen = this.setScreen.bind(this)
    this.updateNotebook = this.updateNotebook.bind(this)
    this.updateSettings = this.updateSettings.bind(this)
    this.importNotebook = this.importNotebook.bind(this)
    this.clearWorkspace = this.clearWorkspace.bind(this)
    this.toggleTheme = this.toggleTheme.bind(this)

    this.createNotebookFromURL = this.createNotebookFromURL.bind(this)
  }

  componentDidMount () : void {
    this.createNotebookFromURL()
  }

  // TODO: all of this needs to be moved to more apropriate component
  // maybe something like Notebook or similar -- this just isn't right

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
          const notebook : NotebookState = createNewNotebookWithBox(box)

          this.setState({
            currentScreen : Screen.MAIN,
            notebook,
          })

          window.history.pushState(null, '', '/') // TODO: decide if remove or leave

          updateAppStateToStorage({
            ...this.state,
            currentScreen : Screen.MAIN,
            notebook,
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
    const { notebook, currentScreen, theme } = this.state
    const { settings } = notebook

    const darkmode = theme === Theme.Dark

    return (
      <ThemeContext.Provider value={ theme }>
        <div id='app' className={ darkmode ? 'dark' : 'light' }>
          <div id="bad-screen-message">
            Lambdulus only runs on screens at least 900 pixels wide.
          </div>
          <TopBar
            state={ this.state }
            onScreenChange={ this.setScreen }
            onImport={ this.importNotebook }
            onClearWorkspace={ this.clearWorkspace }
            onDarkModeChange={ this.toggleTheme }
          />


          <MenuBar
            state={ this.state }
            onScreenChange={ this.setScreen }
          />

          { (() => {
            switch (currentScreen) {
              case Screen.MAIN:
                return <Notebook state={ notebook } updateNotebook={ this.updateNotebook } settings={ settings } />

              case Screen.HELP:
                return <Help/>

              case Screen.SETTINGS:
                return <SettingsScreen settings={ settings } updateSettings={ this.updateSettings } />
            }
          })()}
        </div>

      </ThemeContext.Provider>
    )
  }

  setScreen (screen : Screen) : void {
    this.setState({ currentScreen : screen })
  }

  updateNotebook (notebookPatch : Partial<NotebookState>) : void {
    const { notebook } = this.state
    const newNotebook = { ...notebook, ...notebookPatch }

    this.setState({ notebook : newNotebook })

    updateNotebookStateToStorage(newNotebook)
  }

  importNotebook (notebook : NotebookState) : void {
    this.setState({
      notebook,
    })

    updateAppStateToStorage({
      ...this.state,
      notebook,
    })
  }

  updateSettings (newSettings : GlobalSettings) : void {
    const { notebook } = this.state


    this.setState({ notebook : { ...notebook, settings : newSettings} })
    updateSettingsInStorage(newSettings)
  }

  clearWorkspace () : void {
    if (window.confirm(CLEAR_WORKSPACE_CONFIRMATION)) {

      this.setState({ notebook : InitNotebookState })
      updateNotebookStateToStorage(InitNotebookState)
    }
  }

  toggleTheme () : void {
    const { theme } = this.state
    const opposite = theme === Theme.Dark ? Theme.Light : Theme.Dark

    this.setState({ theme : opposite })
    updateAppStateToStorage({ ...this.state, theme : opposite })
  }

}

function createNewNotebookWithBox (box : BoxState) : NotebookState {
  return {
    boxList : [ box ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    settings : loadSettingsFromStorage(),

    menuOpen : false,

    __key : Date.now().toString(),
  }
}