import React from 'react'

import UntypedLambdaCalculusSet from '../untyped-lambda-integration/Settings'
import { NotebookState } from '../AppTypes'

interface Props {
  state : NotebookState

}

export default function Settings (props : Props) : JSX.Element {
  return (
    <div className='settingsSpace'>
      <UntypedLambdaCalculusSet />
    </div>
  )
}