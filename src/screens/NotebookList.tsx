import React from 'react'
import { AppState, NotebookState } from '../Types'

import '../styles/NotebookList.css'
import Notebook from './Notebook'

interface Props {
  state : AppState
  darkmode : boolean

  onSelectNotebook (index : number) : void
  onRemoveNotebook (index : number) : void
  onUpdateNotebook (notebook : NotebookState, index : number) : void
  onAddNotebook (string ? : string) : void
}

export default function NotebookList (props : Props) : JSX.Element {
  const { state, onSelectNotebook, onRemoveNotebook, onUpdateNotebook, onAddNotebook, darkmode } : Props = props
  const { notebookList } : AppState = state

  return (
    <div className='mainSpace'>
      <ul className='notebook-list UL'>
        <li
          className='LI cursor-pointer notebook-list--add-notebook cursor-pointer notebook-list--notebook'
          onClick={ (e) => {
            e.stopPropagation()
            
            const name : string | null = prompt('Please Write the Name of New Notebook')

            if (name !== null) {
              onAddNotebook(name)
              return
            }

            // onAddNotebook() // don't add new notebook when user cancels the prompt
          }}
        >
          <div className='notebook-list--add-notebook--container'>
            <i className="mini-icon fas fa-plus" />
          </div>
        </li>
        {
          notebookList.map((notebook : NotebookState, index : number) =>
            <li className='LI cursor-pointer notebook-list--notebook' key={notebook.__key} onClick={ () => onSelectNotebook(index) }>
              <div className='notebook-list--notebook-thumbnal'>
                <Notebook
                  state={ notebook }
                  settings={ notebook.settings }
                  updateNotebook={ () => void 0 }
                  darkmode={ darkmode }
                />
              </div>
              <div className='notebook-list--notebook-footer'>
                <span className='notebook-list--notebook-footer--title'>
                  { notebook.name }
                </span>
                <div className='notebook-list--notebook-footer--menu'>
                  <div
                    onClick={ (e) => {
                      e.stopPropagation()
                      onUpdateNotebook({ ...notebook, menuOpen : ! notebook.menuOpen }, index)
                    } }
                    className={ `notebook-list--notebook--menu--dots ${notebook.menuOpen ? 'menu-pressed-open' : ''}` }
                  >
                    <i className="mini-icon fas fa-ellipsis-v"></i>
                  </div>
                </div>
              </div>
              {
                notebook.menuOpen ?
                  <div
                    className='notebook-list--notebook--menu'
                    ref={ (elem : any) => {
                      // just to be able to always see the menu
                      if (elem !== null) {
                        const boundingRect = elem.getBoundingClientRect()
                        const viewportHeight : number = window.innerHeight
                        if (boundingRect.bottom > viewportHeight) {
                          elem.scrollIntoView(false)
                        }
                      }
                    } }  
                  >
                    {/* TODO: move into ... menu */}
                    <div
                      className='box-top-bar--menu-item'
                      onClick={ (e) => {
                        e.stopPropagation()
                        onRemoveNotebook(index)
                      } }
                    >
                      Remove
                      {/* <i
                        className='mini-icon far fa-trash-alt'
                        onClick={ removeBox }
                        title='Remove this Box'
                      /> */}
                    </div>

                    <div
                      className='box-top-bar--menu-item'
                      onClick={ (e) => {
                        e.stopPropagation()
                        const name : string | null = prompt('Please Enter New Name for the Notebook')

                        if (name !== null && name !== "") {
                          onUpdateNotebook({ ...notebook, name, menuOpen : false }, index)
                        }
                        else {
                          onUpdateNotebook({ ...notebook, menuOpen : false }, index)
                        }
                      } }
                    >
                      Rename
                    </div>
                  </div>
                :
                null

              }
            </li>
          )

        }
      </ul>
    </div>
  )
}