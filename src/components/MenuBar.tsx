import React from 'react'

import { Screen, AppState } from '../Types'


import '../styles/MenuBar.css'

interface MenuBarProperties {
  state : AppState
  onScreenChange (screen : Screen) : void
}

export default function MenuBar (props : MenuBarProperties) : JSX.Element {
  const { state, onScreenChange } : MenuBarProperties = props

  const { currentScreen } = state

  return (
    <div id="menu-bar">
      <div
        className='tab'
        title='Get Info about this Tool'
        onClick={ () => onScreenChange(Screen.MAIN) }
      >
        <span className='lambdulusIcon'>λ</span>
        <p className='iconLabel'>Lambdulus</p>
      </div>

      <div className='menu-bar--bottom-part'>
        {/* Issues */}
        <div
          className='tab tab-hoverable'
          title='Submit a Bug or a Feature Request'
        >
          <a
            target="_blank"
            rel="noopener noreferrer"
            href='https://github.com/lambdulus/frontend/issues'
          >
            <i className="icon fas fa-bug" />
          </a>
          <p className='iconLabel'>GH Issues</p>
        </div>

        {/* MANUAL/HELP */}
        <div
          className={ currentScreen === Screen.HELP ? 'currentTab tab tab-hoverable' : 'tab tab-hoverable' }
          title={ currentScreen === Screen.MAIN ? 'Show the Manual' : 'Go back' }
          onClick={ () => {
            if (currentScreen === Screen.HELP) {
              onScreenChange(Screen.MAIN)
            }
            else {
              onScreenChange(Screen.HELP)
            }
          }}
        >
          <i
            className="icon far fa-question-circle"
          />
          <p className='iconLabel'>Manual</p>
        </div>
      </div>


    </div>
  )
}
