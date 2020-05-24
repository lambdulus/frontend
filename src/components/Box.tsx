import React, { useContext, ReactNode } from 'react'

// import Evaluator from './ExpressionBox'
// import MacroDefinition from './MacroDefinition'
// import Note from './Note'
// import { MacroTableContext } from './EvaluatorSpace'
// import { SetBoxContext } from './BoxSpace'
import { BoxType, BoxState } from '../Types'

import { UntypedLambdaState } from '../untyped-lambda-integration/AppTypes'

import EvaluatorIntegration from '../untyped-lambda-integration/ExpressionBox'

import { NoteState } from '../markdown-integration/AppTypes'
import Note from '../markdown-integration/Note'

// import { BoxState } from '../AppTypes'

interface BoxProperties {
  state : BoxState
  isActive : boolean
  isFocused : boolean

  updateBoxState (box : BoxState) : void
  addBox (box : BoxState) : void
}

export default function Box (props : BoxProperties) : JSX.Element {
  const { state, isActive, isFocused, updateBoxState, addBox } : BoxProperties = props
  const { type } = state

  // const macroTable = useContext(MacroTableContext)
  // const setBoxState = useContext(SetBoxContext)


  if (type === BoxType.UNTYPED_LAMBDA) {
    return (
      <EvaluatorIntegration
        state={ state as UntypedLambdaState }
        isActive={ isActive }
        isFocused={ isFocused }
        // macroTable={ macroTable }
        
        setBoxState={ updateBoxState }
        addBox={ addBox }
      />
    )
  }
  if (type === BoxType.MARKDOWN) {
    return (
      <Note
        state={ state as NoteState }
        isActive={ isActive }
        isFocused={ isFocused }

        setBoxState={ updateBoxState }
      />
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