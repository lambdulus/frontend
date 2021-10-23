import React from 'react'
import { ASTReduction, ASTReductionType } from '@lambdulus/core' // , Eta


interface ReductionMessageProperties {
  lastReduction : ASTReduction | null
}

export default function ReductionMessage (props : ReductionMessageProperties) : JSX.Element {
  const { lastReduction } = props

  if (lastReduction === null) {
    return null as any
  }

  if (lastReduction.type === ASTReductionType.BETA) {
    return (
      <p className='lastReduction'>
        β reduction
      </p>
    )
  }

  if (lastReduction.type === ASTReductionType.ALPHA) {
    return (
      <p className='lastReduction'>
        α conversion
      </p>
    )
  }

  if (lastReduction.type === ASTReductionType.EXPANSION) {
    return (
      <p className='lastReduction'>
        Macro expansion
      </p>
    )
  }

  if (lastReduction.type === ASTReductionType.ETA) {
    return (
      <p className='lastReduction'>
        η conversion
      </p>
    )
  }

  if (lastReduction.type === ASTReductionType.GAMA) {
    return (
      <p className='lastReduction'>
        Simplified Beta Reduction
      </p>
    )
  }

  else {
    return null as any
  }
  
}