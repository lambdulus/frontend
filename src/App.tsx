import React, { Component } from 'react'

import './App.css'

import { AppState, Screen, NotebookState } from './AppTypes'

import MenuBar from './components/MenuBar'
import Notebook from './components/Notebook'


interface Props {}
export default class App extends Component<Props, AppState> {
  constructor (props : Props) {
    super(props)

    this.state = {
      notebookList : [{ boxList : [], activeBoxIndex : NaN }],
      currentNotebook : 0,
      currentScreen : Screen.MAIN,
    }

    this.setScreen = this.setScreen.bind(this)
    this.updateNotebook = this.updateNotebook.bind(this)
    this.changeNotebook = this.changeNotebook.bind(this)

    // TODO: implement Class Keyboard Controller -> handling all keyboard events and firing events -> invoking handlers from this class
    // document.addEventListener('keydown', (event : KeyboardEvent) => {
    //   console.log(event)
    // })
  }


  render () {
    const { notebookList, currentNotebook } = this.state
    const state = notebookList[currentNotebook]

    return (
      <div id='app'>
        <MenuBar
          state={ this.state }
          onScreenChange={ this.setScreen }
          onImport={ () => void 0 }
          onNotebookChange={ this.changeNotebook }
          onAddNotebook={ (notebook : NotebookState) => this.setState({ notebookList : [ ...this.state.notebookList, notebook ] }) }
          // TODO: there are gonna be all kinds of Notebooks - I need to take care of that
          onSelectNotebook={ (index : number) => this.setState({ currentNotebook : index }) }
        />
        <Notebook state={ state } updateNotebook={ this.updateNotebook } />
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
  }

  changeNotebook (index : number) : void {
    this.setState({ currentNotebook : index })
  }
}
