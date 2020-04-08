import React, { Component } from 'react';
// import logo from './logo.svg';
// import './App.css';

import { AppState, BoxState } from './AppTypes'

import MenuBar from './components/MenuBar'

import Box from './components/Box'


interface Props {}



class App extends Component<Props, AppState> {
  constructor (props : Props) {
    super(props)

    this.state = {
      boxList : [ { type : 0, __key : '0' } ],
      activeBoxIndex : 0,
    }
  }


  render () {
    return (
      <div id='app'>
        <MenuBar state={ this.state } />

        <div>
          <ul>
            { this.state.boxList.map(
              (box : BoxState, i : number) =>
              <li key={ box.__key }>
                <div className='smallEmpty'>
                  { <CreateBox  /> }
                </div>
                <Box state={ box } isActive={ i === this.state.activeBoxIndex } />

              </li>
            ) }
          </ul>
          <div className='smallEmpty'>
            { <CreateBox  /> }
          </div>
        </div>
      </div>
    )
  }
}

export default App;
