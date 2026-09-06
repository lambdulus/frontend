import React from 'react'
import { MacroMap, builtinMacros } from '@lambdulus/core'

import './styles/MacroList.css'


export interface MacroProperties {
  macroTable : MacroMap
}

function MacroRow ({ name, body } : { name : string, body : string }) : JSX.Element {
  return (
    <li className='LI macro-row'>
      <span className='macro-name'>{ name }</span>
      <span className='macro-assign' aria-hidden='true'>:=</span>
      <span className='macro-body'>{ body }</span>
    </li>
  )
}

export default function MacroList (props : MacroProperties) : JSX.Element {
  const { macroTable } = props
  const userMacros : Array<[string, string]> = Object.entries(macroTable)

  return (
    <div className='macroSpace'>
      <p className='macro-group-title'>Built-in macros</p>
      <ul className='UL macro-list'>
        { Object.entries(builtinMacros).map(([macroName, macroExpression]) =>
          <MacroRow key={ macroName } name={ macroName } body={ macroExpression } />
        ) }
      </ul>

      <p className='macro-group-title'>User-defined macros</p>
      { userMacros.length === 0 ?
        <p className='macro-empty'>No user-defined macros yet — write <code>name := …</code> above the expression.</p>
      :
        <ul className='UL macro-list'>
          { userMacros.map(([macroName, macroExpression]) =>
            <MacroRow key={ macroName } name={ macroName } body={ macroExpression } />
          ) }
        </ul>
      }
    </div>
  )
}
