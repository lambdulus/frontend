import React, { ChangeEvent } from 'react'
import { AST, tokenize, parse, Token, MacroMap, None } from '@lambdulus/core'

import { AppState, Screen, BoxState, BoxType, NotebookState, ANY_BOX } from '../AppTypes'


import '../styles/MenuBar.css'
// import { reportEvent } from '../misc'; // later

interface MenuBarProperties {
  state : AppState
  onImport (state : AppState) : void
  onScreenChange (screen : Screen) : void
  onNotebookChange (index : number) : void
  onAddNotebook (notebook : NotebookState) : void
  onSelectNotebook (index : number) : void
  onDeleteNotebook (index : number) : void
}

export default function MenuBar (props : MenuBarProperties) : JSX.Element {
  const { state, onImport, onScreenChange, onNotebookChange, onDeleteNotebook } : MenuBarProperties = props
  const { notebookList, currentNotebook } = state

  console.log('current notebook ', currentNotebook)
  // const { screen } = state

  // const dehydrated : object = dehydrate(state)

  const serialized : string = JSON.stringify(state)
  const link : string = createURL(serialized)

  return (
    <div id="menu-bar">
      <ul className='notebooks UL'>
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
        <div className='addNotebook' onClick={ () => props.onAddNotebook({ boxList : [], activeBoxIndex : NaN, allowedBoxes : ANY_BOX, __key : Date.now().toString() }) } >
          +
        </div>
      </ul>


      <div title='Show help!'>
        {
          // screen === Screen.main ?
            <i
              className="icon far fa-question-circle fa-2x"
              // onClick={ () => onScreenChange(Screen.help) }
            />
            // :
            // screen === Screen.help ?
            //   <i className="icon far fa-window-close fa-2x" onClick={ () => onScreenChange(Screen.main) } />
            //   :
            //   <i className="icon far fa-question-circle fa-2x" onClick={ () => onScreenChange(Screen.help) } />
        }
        <p className='iconLabel'>Help</p>
      </div>

      {/* <div title='List all defined macros' >
        {
          screen === Screen.main ?
            <i className="icon fas fa-list-ul fa-2x" onClick={ () => onScreenChange(Screen.macrolist) } />
            :
            screen === Screen.macrolist ?
              <i className="icon far fa-window-close fa-2x" onClick={ () => onScreenChange(Screen.main) } />
              :
              <i className="icon fas fa-list-ul fa-2x" onClick={ () => onScreenChange(Screen.macrolist) } />
        }
        <p className='iconLabel'>Macros</p>
      </div>         */}
        
      <div title='Download this notebook'>
        <a
          className='export'
          href={ link }
          download="notebook_lambdulus.json"
          // onClick={ () => setTimeout(() => {
          //   window.URL.revokeObjectURL(link)
          //   reportEvent('Export notebook', `Notebook: ${serialized}`, '')
          // }, 10) }
        >
          <i id='download' className="icon fas fa-cloud-download-alt fa-2x" />
        </a>
        <p className='iconLabel'>Export</p>
      </div>
      
      <div title='Open exported notebook'>
        <input type="file" accept="application/json" id="input" onChange={ (e) => onFiles(e, onImport) } />
        <label htmlFor="input"><i className="icon fas fa-cloud-upload-alt fa-2x"></i></label>
        <p className='iconLabel'>Import</p>
      </div>

      <div title='Report a bug or request new feature'>
        <a href='https://github.com/lambdulus/new-frontend/issues' target="_blank">
          <i className="icon fas fa-bug fa-2x"></i>
        </a>
        <p className='iconLabel'>Issues</p>
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

function onFiles (event : ChangeEvent<HTMLInputElement>, onImport : (state : AppState) => void) : void {
  const { target : { files } } = event
  if (files === null) {
    return
  }

  const file : File = files[0]
  const reader : FileReader = new FileReader
  reader.onload = (event : Event) => {
    const state : AppState = JSON.parse(reader.result as string)

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