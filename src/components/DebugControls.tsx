import React, { PureComponent } from 'react'

import '../styles/DebugControls.css'


interface Props {
  onStep : () => void
  onRun : () => void
}

// TODO: Consider separating the `keydown` event handler into different file
// it would be singleton module, which would make sure ONLY ONE `DebugControls` component
// is subscribed to the `keydown` event
export default class DebugControls extends PureComponent<Props> {
  constructor (props : Props) {
    super(props)
  }

  componentDidMount () : void {
    document.onkeydown = (event) => {
      console.log('KEYDOWN', event.key)
      if ( ( ! event.shiftKey)
        && ( ! event.ctrlKey)
        && ( ! event.altKey)
        && ( ! event.metaKey)
        && (event.key === 'F8' || event.key === 'F9')) {
          if (event.key === 'F8') {
            this.props.onStep()
          }
          if (event.key === 'F9') {
            this.props.onRun()
          }
        }
    }
  }

  componentWillUnmount () : void {
    document.onkeydown = () => void 0
  }

  render () {
    const { onStep, onRun } : Props = this.props
  
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

}