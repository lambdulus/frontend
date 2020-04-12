import React, { useContext } from 'react'

// import Evaluator from './ExpressionBox'
// import MacroDefinition from './MacroDefinition'
// import Note from './Note'
// import { MacroTableContext } from './EvaluatorSpace'
// import { SetBoxContext } from './BoxSpace'
import { BoxState, BoxType, MacroDefinitionState, NoteState } from '../AppTypes'

import { EvaluationState } from '../untyped-lambda-integration/AppTypes'

import EvaluatorIntegration from '../untyped-lambda-integration/ExpressionBox'

// import { BoxState } from '../AppTypes'

interface BoxProperties {
  state : BoxState
  isActive : boolean

  // removeExpression () : void // not yet
}

export default function Box (props : BoxProperties) : JSX.Element {
  const { state, isActive } : BoxProperties = props
  const { type } = state

  // const macroTable = useContext(MacroTableContext)
  // const setBoxState = useContext(SetBoxContext)


  if (type === BoxType.LAMBDA) {
    return (
      <div className='box'>
        { state.__key }
        <p>Hello Box world</p>
        <EvaluatorIntegration
          state={ state as EvaluationState }
          isActive={ isActive }
          macroTable={ macroTable }
          
          setBoxState={ setBoxState }
        />
      </div>
    )
  }
  else {
    return (
      <div>
        Uknown BOX
      </div>
    )
  }

  // if (type === BoxType.MACRO) {
  //   return (
  //     <div className=''>
  //       <MacroDefinition
  //         state={ state as MacroDefinitionState }
  //         setBoxState={ setBoxState }

  //         // addBox={ addBox }
  //       />
  //     </div>
  //   )
  // }

  // if (type === BoxType.MARKDOWN) {
  //   return (
  //     <div className=''>
  //       <Note
  //         state={ state as NoteState }
  //         isActive={ isActive }

  //         // addBox={ addBox }
  //       />
  //     </div>
  //   )
  // }

  // return null as any // never happens
}