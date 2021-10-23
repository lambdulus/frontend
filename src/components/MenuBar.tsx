import React from 'react'

import { Screen, AppState } from '../Types'


import '../styles/MenuBar.css'
// import { reportEvent } from '../misc'; // later

interface MenuBarProperties {
  state : AppState
  // onImport (state : AppState) : void
  // onClearWorkspace () : void
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

      {/* <div className='separator' /> */}

      {/* NOTEBOOK */}
      {/* <div
        className={ currentScreen === Screen.NOTEBOOKS ? 'currentTab tab tab-hoverable' : 'tab tab-hoverable' }
        title='Show All Notebooks'
        onClick={ () => onScreenChange(Screen.NOTEBOOKS) }
      >
        <i
          // className="icon far fa-file-alt"
          className="icon far fa-copy"
        />
        <p className='iconLabel'>Notebooks</p>
      </div> */}

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


// function onFiles (event : ChangeEvent<HTMLInputElement>, onImport : (notebook : NotebookState) => void) : void {
//   const { target : { files } } = event
//   if (files === null) {
//     return
//   }

//   const file : File = files[0]
//   const reader : FileReader = new FileReader
//   reader.onload = (event : Event) => {
//     const notebook : NotebookState = JSON.parse(reader.result as string)

//     onImport(decodeNotebook(notebook))

//     // onImport(hydrate(state))
//     // reportEvent('Import notebook', `Notebook named ${ file.name }`, '')
//   }

//   reader.readAsText(file) 
// }

// function createURL (content : string) : string {
//   const data = new Blob([ content ], {
//     type: 'application/json'
//   })

//   return window.URL.createObjectURL(data);
// }