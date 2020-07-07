import React, { Component } from 'react'

import './App.css'

import { updateSettingsInStorage, loadAppStateFromStorage, updateAppStateToStorage, CLEAR_WORKSPACE_CONFIRMATION, loadSettingsFromStorage, ANY_BOX, initIntegrationStates } from './AppTypes'

import MenuBar from './components/MenuBar'
import Notebook from './screens/Notebook'
import Help from './screens/Help'
import SettingsScreen from './screens/Settings'
import { Screen, AppState, NotebookState, GlobalSettings } from './Types'
import { UNTYPED_LAMBDA_INTEGRATION_STATE } from './untyped-lambda-integration/AppTypes'



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

    this.state = loadAppStateFromStorage()

    initIntegrationStates(this.state)

    this.setScreen = this.setScreen.bind(this)
    this.updateNotebook = this.updateNotebook.bind(this)
    this.changeNotebook = this.changeNotebook.bind(this)
    this.addNotebook = this.addNotebook.bind(this)
    this.removeNotebook = this.removeNotebook.bind(this)
    this.editNotebookName = this.editNotebookName.bind(this)
    this.changeNotebookName = this.changeNotebookName.bind(this)
    this.stopEditingNotebook = this.stopEditingNotebook.bind(this)
    this.updateSettings = this.updateSettings.bind(this)
    this.importWorkspace = this.importWorkspace.bind(this)
    this.clearWorkspace = this.clearWorkspace.bind(this)

    // TODO: implement Class Keyboard Controller -> handling all keyboard events and firing events -> invoking handlers from this class
    // document.addEventListener('keydown', (event : KeyboardEvent) => {
    //   console.log(event)
    // })
  }


  render () {
    const { notebookList, currentNotebook, currentScreen } = this.state
    const state = notebookList[currentNotebook]
    const { settings } = state

    return (
      <div id='app'>
        <MenuBar
          state={ this.state }
          onScreenChange={ this.setScreen }
          onImport={ this.importWorkspace }
          onClearWorkspace={ this.clearWorkspace }
        />
        
        {/* TODO: Commenting this out for now - world is not yet ready for such powers */}
        {/* {
          notebookList.length > 0 ?
            <ul className='notebook-list UL'>
              <div className='notebook-list--title'>
                Notebook Explorer:
              </div>
              {
                notebookList.map(
                  (notebook : NotebookState, index : number) =>
                  <li
                    className={ `notebook-tab LI ${ currentNotebook === index ? 'current' : '' }` }
                    key={ notebook.__key }
                    title='Click to Select this Notebook'
                    onClick={ () => this.changeNotebook(index) }
                  >
                    {
                      notebook.editingName ?
                        <input
                          type='text'
                          value={ notebook.name }
                          onChange={ (event) => this.changeNotebookName(index, event.target.value) }
                          onBlur={ () => this.stopEditingNotebook(index) }
                          maxLength={12}
                          size={ 10 }
                          />
                      :
                        notebook.name
                    }
                    <span
                      className='notebook-tab--edit-name'
                      onClick={ (event) => {
                        event.stopPropagation()

                        this.editNotebookName(index)
                      }}
                    >
                      <i className="edit-name mini-icon fas fa-pen" title='Click to Change the Notebook Name' />
                    </span>

                    <div className='notebookIconWrapper'>
                        {
                          notebookList.length === 1 ?
                          null
                          :
                          <i
                            className="removeNtb mini-icon fas fa-trash-alt"
                            title='Click to Remove this Notebook'
                            onClick={ (event) => {
                              event.stopPropagation()
                              this.removeNotebook(index) } }
                          />
                        }
                      </div>
                  </li>
                )
              }
              <li
                className='notebook-tab LI'
                title='Click to Add New Notebook'
                onClick={ this.addNotebook }
              >
                Add New
                <div className='notebookIconWrapper'>
                  <i className="addNtb mini-icon fas fa-plus" />
                  </div>
              </li>
            </ul>
          :
            null
        } */}
        {
          (() => {
            if (currentScreen === Screen.MAIN)
              return <Notebook state={ state } updateNotebook={ this.updateNotebook } settings={ settings } />
            if (currentScreen === Screen.HELP)
              return <Help/>
            if (currentScreen === Screen.SETTINGS)
              return <SettingsScreen settings={ settings } updateSettings={ this.updateSettings } />
          })()
        }
        
      </div>
    )
  }

  setScreen (screen : Screen) : void {
    this.setState({ currentScreen : screen })
  }

  updateNotebook (notebook : NotebookState) : void {
    const { notebookList, currentNotebook } = this.state

    notebookList[currentNotebook] = notebook

    this.setState({ notebookList })
    updateAppStateToStorage({ ...this.state })
    // NOTE: Carefuly around here - I kinda rely on the mutation of this.state.notebookList
  }

  changeNotebook (index : number) : void {
    this.setState({ currentNotebook : index })
    updateAppStateToStorage({ ...this.state, currentNotebook : index })
  }

  addNotebook () : void {
    this.setState({
      notebookList : [ ...this.state.notebookList, createNewNotebook() ],
      currentNotebook : this.state.currentNotebook + 1
    })

    updateAppStateToStorage({
      ...this.state,
      notebookList : [ ...this.state.notebookList, createNewNotebook() ],
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
    updateAppStateToStorage({ ...this.state })
  }

  changeNotebookName (index : number, name : string) : void {
    const { notebookList } = this.state

    const notebook : NotebookState = notebookList[index]

    notebookList[index] = { ...notebook, name }

    this.setState({ notebookList })
    updateAppStateToStorage({ ...this.state })
  }

  stopEditingNotebook (index : number) : void {
    const { notebookList } = this.state

    const notebook : NotebookState = notebookList[index]

    notebookList[index] = { ...notebook, editingName : false }

    this.setState({ notebookList })
    updateAppStateToStorage({ ...this.state })
  }

  updateSettings (newSettings : GlobalSettings) : void {
    const { currentNotebook, notebookList } = this.state
    notebookList[currentNotebook].settings = newSettings

    this.setState({ notebookList : [...notebookList] })
    updateSettingsInStorage(newSettings)
  }

  importWorkspace (state : AppState) : void {
    this.setState(state)
    updateAppStateToStorage(state)
  }

  clearWorkspace () : void {
    if (window.confirm(CLEAR_WORKSPACE_CONFIRMATION)) {
      localStorage.removeItem('AppState')

      this.setState(loadAppStateFromStorage())
    }
  }
}

function createNewNotebook () : NotebookState {
  return {
    boxList : [],
    activeBoxIndex : NaN,
    focusedBoxIndex : undefined,
    allowedBoxes : ANY_BOX,
    settings : loadSettingsFromStorage(),
    integrationStates : {
      'UNTYPED_LAMBDA' : UNTYPED_LAMBDA_INTEGRATION_STATE,
    },
    
    __key : Date.now().toString(),
    name : "Temp Notebook",
    editingName : false,
    persistent : true, // TODO: you can change this if explicit save/rename is required for persistency
  }
}