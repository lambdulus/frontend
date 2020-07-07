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
      <div className='builtinMacros'>
        <p>Built-in Macros:</p>
        <ul className='UL'>
          { Object.entries(builtinMacros).map(([macroName, macroExpression]) =>
            <div key={ macroName }>
              <li className='LI dense-LI'>
                <div className='macro-definition'>
                  { macroName } := { macroExpression }
                </div>
              </li>
            </div>
          ) }
        </ul>
      </div>

      <div className='userMacros'>      
        <p>User-defined Macros:</p>
        <ul className='UL'>
          { Object.entries(macroTable).map(([macroName, macroExpression]) =>
              <div key={ macroName }>
                <li className='LI dense-LI'>
                  <div className='macro-definition'>
                    { macroName } := { macroExpression }
                  </div>
                </li>
              </div>
            ) }
        </ul>
      </div>
    </div>
  )
}