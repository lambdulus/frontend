import React, { PureComponent } from 'react'
import { Play, SkipForward, Square } from 'lucide-react'

import '../styles/DebugControls.css'


interface Props {
  isRunning : boolean
  // disableRun : boolean /* TODO: this is just for now -- because I am not sure students will know how to exercise with simplified */

  onStep : () => void
  onRun : () => void
}

// TODO: Consider separating the `keydown` event handler into different file
// it would be singleton module, which would make sure ONLY ONE `DebugControls` component
// is subscribed to the `keydown` event
export default class DebugControls extends PureComponent<Props> {
  componentDidMount () : void {
    document.onkeydown = (event) => {
      if ( ( ! event.shiftKey)
        && ( ! event.ctrlKey)
        && ( ! event.altKey)
        && ( ! event.metaKey)
        && (event.key === 'F8' || event.key === 'F9')) {
          if (event.key === 'F8') {
            event.preventDefault()
            this.props.onStep()
          }
          if (event.key === 'F9') { /* TODO: this is just for now -- because I am not sure students will know how to exercise with simplified */
            event.preventDefault()
            this.props.onRun()
          }
        }
    }
  }

  componentWillUnmount () : void {
    document.onkeydown = () => void 0
  }

  render () {
    const { isRunning, onStep, onRun } : Props = this.props
  
    const runMessage : string =
      isRunning ? 'Stop the Evaluation (Press F9)' :  'Evaluate the Expression (Press F9)'

    return (
      <div className='debug-controls'>
        {
          /* TODO: this is just for now -- because I am not sure students will know how to exercise with simplified */
          // this.props.disableRun ?
            // null
          // :
          <button
            title={ runMessage }
            type="button"
            className='btn debug-controls--run'
            onClick={ onRun }
          >
            <span className='debug-controls--btn-label'>{ isRunning ? 'Stop' : 'Run' }</span>
            { isRunning ? <Square size={ 13 } strokeWidth={ 1.75 } /> : <Play size={ 13 } strokeWidth={ 1.75 } /> }
          </button>
        }
        
        
        <button
          title='Evaluate Next Step (Press F8)'
          type="button"
          className='btn debug-controls--step'
          onClick={ onStep }
          disabled={ isRunning }
        >
          <span className='debug-controls--btn-label'>Step</span>
          <SkipForward size={ 13 } strokeWidth={ 1.75 } />
        </button>
      </div>
    )
  }

}