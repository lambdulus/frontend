import React, { useContext } from 'react'

// import Evaluator from './ExpressionBox'
// import MacroDefinition from './MacroDefinition'
// import Note from './Note'
// import { MacroTableContext } from './EvaluatorSpace'
// import { SetBoxContext } from './BoxSpace'
// import { BoxState, BoxType, EvaluationState, MacroDefinitionState, NoteState } from '../AppTypes'


import { BoxState } from '../AppTypes'

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


  // if (type === BoxType.LAMBDA) {
    return (
      <div className=''>
        <p>Hello Box world</p>
        {/* TODO: misto tohohle bude asi komponenta Integrace
        <Evaluator
          state={ state as EvaluationState }
          isActive={ isActive }
          macroTable={ macroTable }
          
          setBoxState={ setBoxState }
        /> */}
      </div>
    )
  // }

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