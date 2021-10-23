import React, { Component } from 'react'

import './App.css'

import { updateSettingsInStorage, loadAppStateFromStorage, updateAppStateToStorage, updateNotebookStateToStorage, CLEAR_WORKSPACE_CONFIRMATION, loadSettingsFromStorage, initIntegrationStates, InitNotebookState, DEFAULT_WHITELIST } from './Constants'

import TopBar from './components/TopBar'
import MenuBar from './components/MenuBar'
import Notebook from './screens/Notebook'
import Help from './screens/Help'
import SettingsScreen from './screens/Settings'
import { Screen, AppState, NotebookState, GlobalSettings, BoxType, BoxState } from './Types'
import { UNTYPED_LAMBDA_INTEGRATION_STATE, createNewUntypedLambdaBoxFromSource, defaultSettings } from './untyped-lambda-integration/AppTypes'
import NotebookList from './screens/NotebookList'
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

    this.state = loadAppStateFromStorage()

    initIntegrationStates(this.state) // TODO: go and refactor the implementation of this fn

    this.setScreen = this.setScreen.bind(this)
    this.updateNotebook = this.updateNotebook.bind(this)
    this.changeNotebook = this.changeNotebook.bind(this)
    this.addNotebook = this.addNotebook.bind(this)
    this.removeNotebook = this.removeNotebook.bind(this)
    this.editNotebookName = this.editNotebookName.bind(this)
    this.changeNotebookName = this.changeNotebookName.bind(this)
    this.stopEditingNotebook = this.stopEditingNotebook.bind(this)
    this.updateSettings = this.updateSettings.bind(this)
    this.importNotebook = this.importNotebook.bind(this)
    // this.importWorkspace = this.importWorkspace.bind(this)
    this.clearWorkspace = this.clearWorkspace.bind(this)
    this.selectNotebook = this.selectNotebook.bind(this)
    this.updateNthNotebook = this.updateNthNotebook.bind(this)

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
          const notebook : NotebookState = createNewNotebookWithBox('Notebook from Link' , box)

          this.setState({
            currentScreen : Screen.MAIN,
            notebookList : [ notebook, ...this.state.notebookList ],
            currentNotebook : 0
          })

          window.history.pushState(null, '', '/') // TODO: decide if remove or leave

          updateAppStateToStorage({
            ...this.state,
            currentScreen : Screen.MAIN,
            notebookList : [ ...this.state.notebookList, notebook ],
            currentNotebook : this.state.notebookList.length - 1
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
    const { notebookList, currentNotebook, currentScreen } = this.state
    const state = notebookList[currentNotebook]
    const { settings } = state

    return (
      <div id='app'>
        <div id="bad-screen-message">
          Lambdulus only runs on screens at least 900 pixels wide.
        </div>
        <TopBar
          state={ this.state }
          onScreenChange={ this.setScreen }
          onImport={ this.importNotebook }
          onClearWorkspace={ this.clearWorkspace }
        />


        <MenuBar
          state={ this.state }
          onScreenChange={ this.setScreen }
        />

        { (() => {
          switch (currentScreen) {
            case Screen.MAIN:
              return <Notebook state={ state } updateNotebook={ this.updateNotebook } settings={ settings } />

            case Screen.NOTEBOOKS:
              return  <NotebookList
                      state={ this.state }
                      onSelectNotebook={ this.selectNotebook }
                      onRemoveNotebook={ this.removeNotebook }
                      onUpdateNotebook={ this.updateNthNotebook }
                      onAddNotebook={ this.addNotebook }
                    />

            case Screen.HELP:
              return <Help/>

            case Screen.SETTINGS:
              return <SettingsScreen settings={ settings } updateSettings={ this.updateSettings } />
          }
        })()}
      </div>
    )
  }

  // NOTE: selectNotebook is ALMOST OK
  selectNotebook (index : number) : void {
    this.setState({
      currentScreen : Screen.MAIN, // TODO: why am I setting the Screen too?
      currentNotebook : index,
    })

    updateAppStateToStorage({
      ...this.state,
      currentScreen : Screen.MAIN, // TODO: why am I setting the Screen too?
      currentNotebook : index,
    })

    // CHANGED:
    // window.history.pushState(null, '', '/')
    // NOTE: I think this is from the time, when prompt content was also propagated to the URL bar
    // so it shouldn't be needed anymore
  }

  // NOTE: setScereen is OK
  setScreen (screen : Screen) : void {
    this.setState({ currentScreen : screen })
  }

  updateNotebook (notebook : Partial<NotebookState>) : void {
    const { notebookList, currentNotebook } = this.state

    notebookList[currentNotebook] = {
      ...notebookList[currentNotebook],
      ...notebook,
    }

    this.setState({ notebookList })

    updateNotebookStateToStorage(notebookList[currentNotebook], currentNotebook)
    // NOTE: Carefuly around here - I kinda rely on the mutation of this.state.notebookList
  }

  updateNthNotebook (notebook : NotebookState, index : number) : void {
    const { notebookList } = this.state
    notebookList[index] = notebook

    this.setState({ notebookList })

    updateNotebookStateToStorage(notebook, index)
  }

  changeNotebook (index : number) : void {
    this.setState({ currentNotebook : index })
    updateAppStateToStorage({ ...this.state, currentNotebook : index })
  }

  addNotebook (name : string = '') : void {
    this.setState({
      notebookList : [ ...this.state.notebookList, createNewNotebook(name) ],
      currentNotebook : this.state.currentNotebook + 1
    })

    updateAppStateToStorage({
      ...this.state,
      currentScreen : Screen.MAIN,
      notebookList : [ ...this.state.notebookList, createNewNotebook(name) ],
      currentNotebook : this.state.currentNotebook + 1
    })
  }

  importNotebook (notebook : NotebookState) : void {
    this.setState({
      notebookList : [ ...this.state.notebookList, notebook ],
      currentNotebook : this.state.currentNotebook + 1
    })

    updateAppStateToStorage({
      ...this.state,
      notebookList : [ ...this.state.notebookList, notebook ],
      currentNotebook : this.state.currentNotebook + 1
    })
  }

  removeNotebook (index : number) : void {
    // if (index === 0) return

    const { notebookList, currentNotebook } = this.state
    
    const nearestValidIndex = (i : number) => {
      if (i < currentNotebook) return currentNotebook - 1
      if (i > currentNotebook) return currentNotebook
      if (notebookList.length === 1) return NaN
      if (i === 0) return i
      return i - 1
    }
    
    const newIndex : number = nearestValidIndex(index)
    
    if (Number.isNaN(newIndex)) return

    notebookList.splice(index, 1)

    this.setState({ notebookList, currentNotebook : newIndex })
    updateAppStateToStorage({
      ...this.state,
      notebookList,
      currentNotebook : newIndex,
    })
  }

  editNotebookName (index : number) : void {
    const { notebookList } = this.state

    const notebook : NotebookState = notebookList[index]

    notebookList[index] = { ...notebook, editingName : true, persistent : true }

    this.setState({ notebookList })
    updateNotebookStateToStorage(notebook, index)
    // updateAppStateToStorage({ ...this.state })
  }

  changeNotebookName (index : number, name : string) : void {
    const { notebookList } = this.state

    const notebook : NotebookState = notebookList[index]

    notebookList[index] = { ...notebook, name }

    this.setState({ notebookList })
    updateNotebookStateToStorage(notebook, index)

    // updateAppStateToStorage({ ...this.state })
  }

  stopEditingNotebook (index : number) : void {
    const { notebookList } = this.state

    const notebook : NotebookState = notebookList[index]

    notebookList[index] = { ...notebook, editingName : false }

    this.setState({ notebookList })
    updateNotebookStateToStorage(notebook, index)
    // updateAppStateToStorage({ ...this.state })
  }

  updateSettings (newSettings : GlobalSettings) : void {
    const { currentNotebook, notebookList } = this.state
    notebookList[currentNotebook].settings = newSettings

    this.setState({ notebookList : [...notebookList] })
    updateSettingsInStorage(newSettings)
  }

  // importWorkspace (state : AppState) : void {
  //   this.setState(state)
  //   updateAppStateToStorage(state)
  // }

  clearWorkspace () : void {
    if (window.confirm(CLEAR_WORKSPACE_CONFIRMATION)) {

      // localStorage.removeItem('AppState')
      const { currentNotebook, notebookList } = this.state
      notebookList[currentNotebook] = InitNotebookState

      this.setState({ notebookList })
      updateNotebookStateToStorage(InitNotebookState, currentNotebook)

      // updateAppStateToStorage(this.state)

      // this.setState(loadAppStateFromStorage())
    }
  }
}

function createNewNotebook (name : string = 'Anonymous Notebook') : NotebookState {
  return {
    boxList : [],
    activeBoxIndex : NaN,
    focusedBoxIndex : undefined,
    allowedBoxes : DEFAULT_WHITELIST,
    settings : loadSettingsFromStorage(),
    integrationStates : {
      'UNTYPED_LAMBDA' : UNTYPED_LAMBDA_INTEGRATION_STATE,
    },

    locked : false,
    menuOpen : false,
    
    __key : Date.now().toString(),
    name,
    editingName : false,
    persistent : true, // TODO: you can change this if explicit save/rename is required for persistency
  }
}

function createNewNotebookWithBox (name : string = 'Notebook from Link', box : BoxState) : NotebookState {
  return {
    boxList : [ box ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    allowedBoxes : DEFAULT_WHITELIST,
    settings : loadSettingsFromStorage(),
    integrationStates : {
      'UNTYPED_LAMBDA' : UNTYPED_LAMBDA_INTEGRATION_STATE,
    },

    locked : false,
    menuOpen : false,
    
    __key : Date.now().toString(),
    name,
    editingName : false,
    persistent : true, // TODO: you can change this if explicit save/rename is required for persistency
  }
}