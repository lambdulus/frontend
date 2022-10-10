import React from 'react'

// import Evaluator from './ExpressionBox'
// import MacroDefinition from './MacroDefinition'
// import Note from './Note'
// import { MacroTableContext } from './EvaluatorSpace'
// import { SetBoxContext } from './BoxSpace'
import { BoxType, BoxState } from '../Types'

import { UntypedLambdaState } from '../untyped-lambda-integration/Types'

import UntypedLambdaBox from '../untyped-lambda-integration/UntypedLambdaBox'

import { NoteState } from '../markdown-integration/AppTypes'
import Note from '../markdown-integration/Note'

import Empty from '../empty-integration'

// import { BoxState } from '../AppTypes'

interface BoxProperties {
  state : BoxState
  isActive : boolean
  isFocused : boolean

  updateBoxState (box : BoxState) : void
  addBoxAfter (box : BoxState) : void
}

export default function Box (props : BoxProperties) : JSX.Element {
  const { state, isActive, isFocused, updateBoxState, addBoxAfter } : BoxProperties = props
  const { type } = state

  // const macroTable = useContext(MacroTableContext)
  // const setBoxState = useContext(SetBoxContext)


  if (type === BoxType.UNTYPED_LAMBDA) {
    return (
      <UntypedLambdaBox
        state={ state as UntypedLambdaState }
        isActive={ isActive }
        isFocused={ isFocused }
        
        setBoxState={ updateBoxState }
        addBox={ addBoxAfter }
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
      <Empty />
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

}