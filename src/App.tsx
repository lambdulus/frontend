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



/**
 * This is the main Application
 * in the future - when building Exam Mode - I will need to replace some part of the application components
 * if it's only some component at the top, it can be done easily
 * if it's gonna replace some deeper stuff I will need to implement some Namespace FROM which app and integrations
 * will inport parts and this Namespace will take care of that
 */


interface Props {}
export default class App extends Component<Props, AppState> {
  constructor (props : Props) {
    super(props)

    console.log(`VERSION: ${process.env.REACT_APP_VERSION_INFO}`)
    console.log(`COMMIT: ${process.env.REACT_APP_COMMIT}`)


    this.state = loadAppStateFromStorage()

    this.setScreen = this.setScreen.bind(this)
    this.updateNotebook = this.updateNotebook.bind(this)
    this.updateSettings = this.updateSettings.bind(this)
    this.importNotebook = this.importNotebook.bind(this)
    this.clearWorkspace = this.clearWorkspace.bind(this)
    this.toggleDarkMode = this.toggleDarkMode.bind(this)

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
    const { notebook, currentScreen, darkmode } = this.state
    const { settings } = notebook

    return (
      <div id='app' className={ darkmode ? 'dark' : 'light' }>
        <div id="bad-screen-message">
          Lambdulus only runs on screens at least 900 pixels wide.
        </div>
        <TopBar
          state={ this.state }
          onScreenChange={ this.setScreen }
          onImport={ this.importNotebook }
          onClearWorkspace={ this.clearWorkspace }
          onDarkModeChange={ this.toggleDarkMode }
        />


        <MenuBar
          state={ this.state }
          onScreenChange={ this.setScreen }
        />

        { (() => {
          switch (currentScreen) {
            case Screen.MAIN:
              return <Notebook state={ notebook } updateNotebook={ this.updateNotebook } settings={ settings } darkmode={ darkmode } />

            case Screen.HELP:
              return <Help darkmode={ darkmode } />

            case Screen.SETTINGS:
              return <SettingsScreen settings={ settings } updateSettings={ this.updateSettings } />
          }
        })()}
      </div>
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

  toggleDarkMode () : void {
    const { darkmode } = this.state

    this.setState({ darkmode : ! darkmode })
    updateAppStateToStorage({ ...this.state, darkmode : ! darkmode })
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