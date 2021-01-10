import React from 'react'
import { MacroMap, builtinMacros } from '@lambdulus/core'

import './styles/MacroList.css'


export interface MacroProperties {
  macroTable : MacroMap
}

export default function MacroList (props : MacroProperties) : JSX.Element {
  const { macroTable } = props

  return (
    <div className='macroSpace'>
      <p>Built-in Macros:</p>
      <ul className='UL'>
        { Object.entries(builtinMacros).map(([macroName, macroExpression]) =>
          <span key={ macroName }>
            <li className='LI dense-LI'>
              <span className='macro-definition'>
                <i className='macro-name'>{ macroName }</i> := { macroExpression }
              </span>
            </li>
          </span>
        ) }
      </ul>

      <p>User-defined Macros:</p>
      <ul className='UL'>
        { Object.entries(macroTable).map(([macroName, macroExpression]) =>
          <span key={ macroName }>
            <li className='LI dense-LI'>
              <span className='macro-definition'>
                <i className='macro-name'>{ macroName }</i> := { macroExpression }
              </span>
            </li>
          </span>
        ) }
      </ul>
    </div>
  )
}