import React, { ChangeEvent } from 'react'

import { AppState, Screen, NotebookState } from '../Types'

import '../styles/TopBar.css'
import { decodeNotebook } from '../Constants'
import { Theme } from '../contexts/Theme'


interface Props {
  state : AppState
  onImport (notebook : NotebookState) : void
  onClearWorkspace () : void
  onScreenChange (screen : Screen) : void
  onDarkModeChange () : void
}

export default function TopBar (props : Props) : JSX.Element {
  const { state, onImport, onClearWorkspace, onScreenChange, onDarkModeChange } : Props = props
  const { notebook : ntbk, currentScreen, theme } : AppState = state

  const darkmode : boolean = theme === Theme.Dark

  // const dehydrated : object = dehydrate(state)

  const serialized : string = JSON.stringify(ntbk)
  const link : string = createURL(serialized)

  return (
    <div className='top-bar'>
      <span className='top-bar--item-container'>

        {/* SETTINGS */}
        <span
          className={ currentScreen === Screen.SETTINGS ? 'top-bar--item top-bar--item-hoverable top-bar--item-hoverable--active' : 'top-bar--item top-bar--item-hoverable' }
          title='Go to the Settings'
          onClick={ () => {
            if (currentScreen === Screen.SETTINGS) {
              onScreenChange(Screen.MAIN)
            }
            else {
              onScreenChange(Screen.SETTINGS)
            }
          } }
        >
          <i
            className="top-icon fas fa-cogs"
          />
          <p className='top-bar--icon-label'>Settings</p>
        </span>

        {/* Clear the Whole Workspace */}
        <span
          className='top-bar--item top-bar--item-hoverable'
          title='Clear the Whole Workspace'
          onClick={ onClearWorkspace }
        >
          <i
            className="top-icon fas fa-eraser"
          />
          <p className='top-bar--icon-label'>Clear All</p>
        </span>
 
        {/* Export Notebook */}
        
        <a
          className='export'
          href={ link }
          download="notebook_lambdulus.lus" // TODO: change the name according to the notebook name
          onClick={ () => setTimeout(() => {
            // window.URL.revokeObjectURL(link)
            // TODO: I shouldn't NOT do this - but if I revoke I can't click it again without re-render
          }, 10) }
        >
          <span
            className='top-bar--item top-bar--item-hoverable'
            title='Download this Notebook'
          >
            <i id='download' className="top-icon fas fa-cloud-download-alt" />
          
          <p className='top-bar--icon-label'>Export</p>
          </span>
        </a>
 
        {/* Import Notebook */}
        <input type="file" accept=".lus" id="input"
          onChange={ (e) => onFiles(e, onImport) }
        />
          <label htmlFor="input">
            <span
              className='top-bar--item top-bar--item-hoverable'
              title='Import a Notebook from Computer'
            >
              <i className="top-icon fas fa-cloud-upload-alt" />
              <p className='top-bar--icon-label'>Import</p>
            </span>
          </label>

        {/* DARKMODE */}
        <span
          className='top-bar--item top-bar--item-hoverable'
          title='Toggle the theme.'
          onClick={ onDarkModeChange }
        >
          <i
            className= { darkmode ? "top-icon fas fa-solid fa-sun" : "top-icon fas fa-solid fa-moon" }
          />
          <p className='top-bar--icon-label'>{ darkmode ? 'Light Mode' : 'Dark Mode' }</p>
        </span>

       </span>
    </div>
  )
}

function onFiles (event : ChangeEvent<HTMLInputElement>, onImport : (notebook : NotebookState) => void) : void {
  const { target : { files } } = event
  if (files === null) {
    return
  }

  const file : File = files[0]
  const reader : FileReader = new FileReader()
  reader.onload = (event : Event) => {
    const notebook : NotebookState = JSON.parse(reader.result as string)

    onImport(decodeNotebook(notebook))

    // onImport(hydrate(state))
  }

  reader.readAsText(file) 
}

function createURL (content : string) : string {
  const data = new Blob([ content ], {
    type: 'application/json'
  })

  return window.URL.createObjectURL(data);
}