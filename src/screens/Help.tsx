import React from 'react'

import LightHelp from './LightHelp'
import DarkHelp from './DarkHelp'

export default function Help (props : { darkmode : boolean }) : JSX.Element {
  const { darkmode } = props
  if (darkmode) {
    return <DarkHelp/>
  }
  else {
    return <LightHelp/>
  }
}