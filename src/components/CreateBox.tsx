import React, { Component } from 'react'

import { ANY_BOX, NO_BOX } from '../AppTypes'
import { BoxType, BoxesWhitelist, BoxState, GlobalSettings } from '../Types'
import { createNewUntypedLambdaExpression, ADD_BOX_LABEL, CODE_NAME as UNTYPED_CODE_NAME } from '../untyped-lambda-integration/AppTypes'
import { UntypedLambdaSettings, UntypedLambdaState } from '../untyped-lambda-integration/Types'
import { createNewMarkdown } from '../markdown-integration/AppTypes'

import "../styles/CreateBox.css"
import PickBoxTypeModal from './PickBoxTypeModal'

interface Props {
  addNew : (box : BoxState) => void
  whiteList : BoxesWhitelist
  settings : GlobalSettings
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
    const { addNew, whiteList, settings } : Props = this.props
    const { modalOpen } = this.state
   
    if (this.state.modalOpen === false) {
      return (
        <div className='create-box-plus' onClick={ () => this.setState({ modalOpen : ! modalOpen }) } >
          <div className='create-box-plus--button'>
            {/* <div className='create-box-plus--container' onClick={ () => {} }> */}
              {/* <p> */}
                <i className="fas fa-plus" />
              {/* </p> */}
            {/* </div> */}
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
          whiteList={ this.props.whiteList }
          settings={ this.props.settings }
        />
      )
    }
  }
}
  
