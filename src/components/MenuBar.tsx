import React, { ChangeEvent } from 'react'
import { AST, tokenize, parse, Token, MacroMap, None } from '@lambdulus/core'

import { ANY_BOX, loadSettingsFromStorage, decode } from '../AppTypes'
import { BoxType, Screen, AppState, NotebookState } from '../Types'


import '../styles/MenuBar.css'
// import { reportEvent } from '../misc'; // later

interface MenuBarProperties {
  state : AppState
  onImport (state : AppState) : void
  onClearWorkspace () : void
  onScreenChange (screen : Screen) : void
  onNotebookChange (index : number) : void
  onAddNotebook (notebook : NotebookState) : void
  onSelectNotebook (index : number) : void
  onDeleteNotebook (index : number) : void
}

export default function MenuBar (props : MenuBarProperties) : JSX.Element {
  const { state, onImport, onClearWorkspace, onScreenChange, onNotebookChange, onDeleteNotebook } : MenuBarProperties = props
  const { notebookList, currentNotebook } = state

  const { currentScreen } = state

  // const dehydrated : object = dehydrate(state)

  const serialized : string = JSON.stringify(state)
  const link : string = createURL(serialized)

  return (
    <div id="menu-bar">
      {/* TODO: SOLVE WHERE TO MOVE NOTEBOOKS TABS */}
      {/* <ul className='notebooks UL'>
        {
          notebookList.map(
            (notebook : NotebookState, index : number) =>
            <li className={ `LI${ currentNotebook === index ? ' current' : '' }` } key={ notebook.__key }>
              <div className='notebookIconWrapper'>
                {
                  notebookList.length === 1 ?
                  null
                  :
                  <i className="removeNtb far fa-times-circle" onClick={ () => onDeleteNotebook(index) } />
                }
                <div className='notebookIcon' onClick={ () => props.onSelectNotebook(index) }>
                  { index }
                </div>
              </div>
            </li>
          )
        }
        <div className='addNotebook' onClick={ () => props.onAddNotebook(createNewNotebook()) } >
          +
        </div>
      </ul> */}

      <div
        className='tab'
        title='Get Info about this Tool'
        onClick={ () => void 0 }
      >
        <span className='lambdulusIcon'>λ</span>
        <p className='iconLabel'>Lambdulus</p>
      </div>

      <div className='separator' />

      {/* NOTEBOOK */}
      <div
        className={ currentScreen === Screen.MAIN ? 'currentTab tab tab-hoverable' : 'tab tab-hoverable' }
        title='Notebook Content'
        onClick={ () => onScreenChange(Screen.MAIN) }
      >
        <i
          className="icon far fa-file-alt"
        />
        <p className='iconLabel'>Notebook</p>
      </div>

      {/* SETTINGS */}
      <div
        className={ currentScreen === Screen.SETTINGS ? 'currentTab tab tab-hoverable' : 'tab tab-hoverable' }
        title='Go to the Settings'
        onClick={ () => onScreenChange(Screen.SETTINGS) }
      >
        <i
          className="icon fas fa-cogs"
        />
        <p className='iconLabel'>Settings</p>
      </div>

      {/* Clear the Whole Workspace */}
      <div
        className='tab tab-hoverable'
        title='Clear the Whole Workspace'
        onClick={ onClearWorkspace }
      >
        <i
          className="icon fas fa-eraser"
        />
        <p className='iconLabel'>Clear All</p>
      </div>

      {/* <div title='List all defined macros' >
        {
          screen === Screen.main ?
            <i className="icon fas fa-list-ul" onClick={ () => onScreenChange(Screen.macrolist) } />
            :
            screen === Screen.macrolist ?
              <i className="icon far fa-window-close" onClick={ () => onScreenChange(Screen.main) } />
              :
              <i className="icon fas fa-list-ul" onClick={ () => onScreenChange(Screen.macrolist) } />
        }
        <p className='iconLabel'>Macros</p>
      </div>         */}

      {/* TODO: SOLVE WHERE TO MOVE FEEDBACK/BUGS/ISSUES */}
      {/* <div
        className='tab'
        title='Report a bug or request new feature'>
        <a href='https://github.com/lambdulus/new-frontend/issues' target="_blank">
          <i className="icon fas fa-bug"></i>
        </a>
        <p className='iconLabel'>Feedback</p>
      </div>  */}

      <div className='separator' />

      {/* Export Notebook */}
      <div
        className='tab tab-hoverable'
        title='Download this Notebook'
      >
        <a
          className='export'
          href={ link }
          download="notebook_lambdulus.lus" // TODO: change the name according to the notebook name
          onClick={ () => setTimeout(() => {
            window.URL.revokeObjectURL(link)
            // reportEvent('Export notebook', `Notebook: ${serialized}`, '') // TODO: report event
          }, 10) }
        >
          <i id='download' className="icon fas fa-cloud-download-alt" />
        </a>
        <p className='iconLabel'>Export</p>
      </div>

      {/* Import Notebook */}
      <div
        className='tab tab-hoverable'
        title='Import a Notebook from Computer'
      >
        <input type="file" accept=".lus" id="input"
        onChange={ (e) => onFiles(e, onImport) }
        />
        <label htmlFor="input"><i className="icon fas fa-cloud-upload-alt"></i></label>
        <p className='iconLabel'>Import</p>
      </div>

      <div className='separator' />

      {/* Issues */}
      <div
        className='tab tab-hoverable'
        title='Submit a Bug or a Feature Request'
      >
        <a
        target="_blank"
          href='https://github.com/lambdulus/new-frontend/issues'
        >
          <i className="icon fas fa-bug" />
        </a>
        <p className='iconLabel'>GH Issues</p>
      </div>

      {/* MANUAL/HELP */}
      <div
        className={ currentScreen === Screen.HELP ? 'currentTab tab tab-hoverable' : 'tab tab-hoverable' }
        title='Show the Manual'
        onClick={ () => onScreenChange(Screen.HELP) }
      >
        <i
          className="icon far fa-question-circle"
        />
        <p className='iconLabel'>Manual</p>
      </div>

    </div>
  )
}

// function dehydrateBox (box : BoxState) : BoxState {
//   const { type } : BoxState = box

//   if (type === BoxType.EXPRESSION) {

//     return {
//       ...box,
//       ast : null as any, // TODO: don't
//       history : [], // TODO: don't
//       isRunning : false,
//       breakpoints : [], // TODO: solve how to don't
//       timeoutID : undefined,
//     }
//   }

//   return box
// }

// function dehydrate (state : AppState) : AppState {
//   return {
//     ...state,
//     submittedBoxes : state.submittedBoxes.map(dehydrateBox)
//   }
// }

// function hydrateBox (box : BoxState, macroTable : MacroMap) : BoxState {
//   const { type } : BoxState = box
  
//   if (type === BoxType.EXPRESSION) {
//     const { singleLetterNames } = box as UntypedLambdaState
//     const ast : AST = parseExpression((box as UntypedLambdaState).expression, { macroTable, singleLetterNames })

//     return {
//       ...box,
//       ast,
//       history : [ { ast, lastReduction : None, step : 0, message : '', isNormalForm : false } ],
//     }
//   }

//   return box
// }

// function hydrate (dehydrated : AppState) : AppState {
//   const { macroTable } = dehydrated
//   const config = { macroTable }

//   return {
//     ...dehydrated,
//     submittedBoxes : dehydrated.submittedBoxes.map((box) => hydrateBox(box, macroTable))
//   }
// }

// interface Config {
//   singleLetterNames : boolean
//   macroTable : MacroMap
// }

// function parseExpression (expression : string, config : Config) : AST {
//   const { singleLetterNames : singleLetterVars, macroTable } : Config = config
  
//   const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars })
//   const ast : AST = parse(tokens, macroTable)

//   return ast
// }

function createNewNotebook () : NotebookState {
  return {
    boxList : [],
    activeBoxIndex : NaN,
    focusedBoxIndex : undefined,
    allowedBoxes : ANY_BOX,
    __key : Date.now().toString(),
    settings : loadSettingsFromStorage()
  }
}

function onFiles (event : ChangeEvent<HTMLInputElement>, onImport : (state : AppState) => void) : void {
  const { target : { files } } = event
  if (files === null) {
    return
  }

  const file : File = files[0]
  const reader : FileReader = new FileReader
  reader.onload = (event : Event) => {
    const state : AppState = JSON.parse(reader.result as string)

    onImport(decode(state))

    // onImport(hydrate(state))
    // reportEvent('Import notebook', `Notebook named ${ file.name }`, '')
  }

  reader.readAsText(file) 
}

function createURL (content : string) : string {
  const data = new Blob([ content ], {
    type: 'application/json'
  })

  return window.URL.createObjectURL(data);
}