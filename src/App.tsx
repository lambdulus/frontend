import React, { Component } from 'react'

import './App.css'

import { updateSettingsInStorage, loadAppStateFromStorage, updateAppStateToStorage } from './AppTypes'

import MenuBar from './components/MenuBar'
import Notebook from './screens/Notebook'
import Help from './screens/Help'
import SettingsScreen from './screens/Settings'
import { Screen, AppState, NotebookState, GlobalSettings } from './Types'



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

    this.setScreen = this.setScreen.bind(this)
    this.updateNotebook = this.updateNotebook.bind(this)
    this.changeNotebook = this.changeNotebook.bind(this)
    this.removeNotebook = this.removeNotebook.bind(this)
    this.updateSettings = this.updateSettings.bind(this)

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
          onImport={ () => void 0 }
          onNotebookChange={ this.changeNotebook }
          onAddNotebook={
            (notebook : NotebookState) =>
              this.setState(
                { notebookList : [ ...this.state.notebookList, notebook ],
                  currentNotebook : this.state.currentNotebook + 1
                })
          }
          // TODO: there are gonna be all kinds of Notebooks - I need to take care of that
          onSelectNotebook={ (index : number) => this.setState({ currentNotebook : index }) }
          onDeleteNotebook={ (index : number) => this.removeNotebook(index) }
        />
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
  }

  updateSettings (newSettings : GlobalSettings) : void {
    const { currentNotebook, notebookList } = this.state
    notebookList[currentNotebook].settings = newSettings

    this.setState({ notebookList })
    updateSettingsInStorage(newSettings)
  }
}
