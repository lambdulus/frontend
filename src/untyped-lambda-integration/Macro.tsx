import React, { useContext } from 'react'

import { BoxState } from '../Types'
import { tokenize, parse, AST, Token, Variable, builtinMacros, MacroMap } from '@lambdulus/core'
import { UntypedLambdaState, UntypedLambdaMacroState } from './Types'
import Editor from '../components/Editor'
// import { MContext } from './MacroContext'


// import { trimStr } from '../misc'
// import Editor from './Editor'
// import { DefineMacroContext } from './MethodInjector'
// import { MacroDefinitionState, BoxState } from '../AppTypes'
// import { DeleteBox } from './BoxSpace'


interface Props {
  state : UntypedLambdaMacroState
  macroContext : { macrotable : MacroMap }
  
  setBoxState (state : UntypedLambdaMacroState) : void
  addBox (box : BoxState) : void
}

export default function Macro (props : Props) : JSX.Element {
  const { state, setBoxState, macroContext } = props
  const { editor } = state
  const { editor : { content, caretPosition, placeholder, syntaxError } } = state
  const { macroName, macroExpression, SLI } = state

  const onContent = (content : string) => {
    setBoxState({
      ...props.state,
      editor : {
        ...editor,
        content,
        caretPosition,
        syntaxError : null,
      }
    })
  }

  const onSubmit = () => {
    const [ macroName, macroExpression ] : Array<string> = content.split(':=').map((str : string) => str.trim())

    // TODO: refactor later - this is just dirty little quick fix
    if ( ! isMacroUnambigous(macroName)) {
      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : new Error(`Macro name is not valid. It redefines built-in Macro.`),
        }
      })

      return
    }

    if ( ! isValidName(macroName, false)) {
      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError :
          // TODO: please fix this - only dirty quick impl
            new Error(`Macro name is not valid.`),
        }
      })

      return
    }

    if ( ! isValidExpression(macroExpression, SLI)) {
      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : new Error(`Macro expression is not valid.`)
        }
      })

      return
    }

    // TODO: hotfix
    // I want Macros submited in SLI mode to have SLI parsed bodies
    // NEW COMMENT: if I recall correctly - this may not need to be fixed
    // even though macro is SLI - after the parse - it shoudl be transformed into the space-netween-identifiers
    // because this is how the whole expression will look like - no???
    const macroBody : string = parseExpression(macroExpression, SLI).toString()

    setBoxState({
      ...state,
      macroName,
      macroExpression : macroBody,
    })

    // defineMacro(macroName, macroBody) // TODO: tady pak budu registrovat do statickyho clena to makro
    macroContext.macrotable[macroName] = macroBody
  
    // const newMacroTable : MacroMap = {
    //   ...macroTable,
    //   [macroName] : macroExpression
    // }
    // this.updateMacros(newMacroTable)
  }

  // TODO: implement same as Evaluator - editor and stuff
  if (macroName === '' && macroExpression === '') {
    // className='box boxMacro inactiveBox'
    return (
      <div className='box'>
        <Editor
          placeholder={ placeholder } // data
          content={ content } // data
          // caretPosition={ caretPosition } // data
          syntaxError={ syntaxError } // data
          shouldReplaceLambda={ true }
          submitOnEnter={ true }

          onContent={ onContent } // fn
          onEnter={ onSubmit } // fn // tohle asi bude potreba
          onExecute={ () => {} } // fn // TODO: tohle Macro nepotrebuje
        />
      </div>
    )
  }

  // className='box boxMacro'
  return (
    <div className='box'>
      { macroName } := { macroExpression }
      {/* <i className='removeBox far fa-trash-alt' onClick={ deleteBox } title='Remove this Box' /> */}
    </div>
  )
}

// TODO: in the future there should be more then boolean to indicate validity
function isValidName (name : string, singleLetterNames : boolean) : boolean {
  try {
    const root : AST = parseExpression(name, singleLetterNames)

    return root instanceof Variable
  }
  catch (exception) {
    return false
  }
}

// THROWS Exceptions
function parseExpression (expression : string, singleLetterNames : boolean) : AST {
  const macroTable = {}
  const singleLetterVars : boolean = singleLetterNames

  const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars })
  const ast : AST = parse(tokens, macroTable)

  return ast
}

function isMacroUnambigous (name : string) : boolean {
  return ! (name in builtinMacros)
}

function isValidExpression (expression : string, singleLetterNames : boolean) : boolean {
  try {
    parseExpression(expression, singleLetterNames)

    return true
  }
  catch (exception) {
    console.log(exception)
    return false
  }
}