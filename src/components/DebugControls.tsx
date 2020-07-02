import React from 'react'

import '../styles/DebugControls.css'


interface Props {
  onStep : () => void
  onRun : () => void
}

export default function DebugControls (props : Props) : JSX.Element {
  const { onStep, onRun } : Props = props

  return (
    <div className='debug-controls'>
      <button
        title='Run the Expression (Press F9)'
        type="button"
        className='btn debug-controls--run'
        onClick={ onRun }
      >
        <span className='debug-controls--btn-label'>Run</span>
        <i className="mini-icon fas fa-play"></i>
      </button>
      
      <button
        title='Evaluate Next Step (Press F8)'
        type="button"
        className='btn debug-controls--step'
        onClick={ onStep }
      >
        <span className='debug-controls--btn-label'>Step</span>
        <i className="mini-icon fas fa-step-forward"></i>
      </button>
    </div>
  )
}