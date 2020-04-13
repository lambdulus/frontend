import React, { Component } from 'react'

import './App.css'

import { AppState, BoxState, Screen } from './AppTypes'

import MenuBar from './components/MenuBar'
import Box from './components/Box'
import { CreateBox } from './components/CreateBox'


interface Props {}
export default class App extends Component<Props, AppState> {
  constructor (props : Props) {
    super(props)

    this.state = {
      boxList : [],
      activeBoxIndex : 0,
      currentScreen : Screen.MAIN,
    }

    this.insertBefore = this.insertBefore.bind(this)
    this.setScreen = this.setScreen.bind(this)

    // TODO: implement Class Keyboard Controller -> handling all keyboard events and firing events -> invoking handlers from this class
    // document.addEventListener('keydown', (event : KeyboardEvent) => {
    //   console.log(event)
    // })
  }


  render () {
    return (
      <div id='app'>
        <MenuBar state={ this.state } onScreenChange={ this.setScreen } />

        <div className="mainSpace">
          <ul className="boxList UL">
            { this.state.boxList.map(
              (box : BoxState, i : number) =>
              <li className="LI" key={ box.__key }>
                
                {/* TODO: This will be refactored out to standalone component. */}
                <div className='addBoxArea'>
                  { <CreateBox addNew={ (box : BoxState) => this.insertBefore(i, box) } /> }
                </div>
                
                <Box state={ box } isActive={ i === this.state.activeBoxIndex } />
              </li>
            ) }

            {/* TODO: This will be refactored out to standalone component. */}
            <div className='addBoxArea'>
              { <CreateBox addNew={ (box : BoxState) => this.insertBefore(this.state.boxList.length, box) } /> }
            </div>

          </ul>
        </div>
      </div>
    )
  }

  insertBefore (index : number, box : BoxState) : void {
    const { boxList } = this.state
    
    boxList.splice(index, 0, box)
    this.setState({ boxList : boxList, activeBoxIndex : index })
  }

  setScreen (screen : Screen) : void {
    this.setState({ currentScreen : screen })
  }
}
