import React, { Component } from 'react'

import { BoxState } from '../Types'

import "../styles/CreateBox.css"
import PickBoxTypeModal from './PickBoxTypeModal'

interface Props {
  addNew : (box : BoxState) => void
}

interface State {
  modalOpen : boolean
}

// TODO: this needs to change
// somehow I need to be able to delegate choosing the specific subtype of the Box
export default class CreateBox extends Component <Props, State> {
  constructor (props : Props) {
    super(props)

    this.state = {
      modalOpen : false
    }
  }

  render () : JSX.Element {
    const { addNew } : Props = this.props
    const { modalOpen } = this.state
   
    if (this.state.modalOpen === false) {
      return (
        <div className='create-box-plus' onClick={ () => this.setState({ modalOpen : ! modalOpen }) } >
          <div className='create-box-plus--button'>
            <i className="fas fa-plus" />
          </div>
        </div>
      )
    }
    else {
      return (
        <PickBoxTypeModal
          addNew={ (box : BoxState) => {
            addNew(box)
            this.setState({ modalOpen : false })
          } }
        />
      )
    }
  }
}
  
