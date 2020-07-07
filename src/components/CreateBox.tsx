import React, { Component } from 'react'

import { ANY_BOX, NO_BOX } from '../AppTypes'
import { BoxType, BoxesWhitelist, BoxState, GlobalSettings } from '../Types'
import { createNewUntypedLambdaExercise, createNewUntypedLambdaExpression, createNewUntypedLambdaMacro, ADD_BOX_LABEL, CODE_NAME as UNTYPED_CODE_NAME } from '../untyped-lambda-integration/AppTypes'
import { UntypedLambdaSettings, UntypedLambdaState } from '../untyped-lambda-integration/Types'
import { createNewMarkdown } from '../markdown-integration/AppTypes'

import "../styles/CreateBox.css"

interface Props {
  addNew : (box : BoxState) => void,
  whiteList : BoxesWhitelist,
  settings : GlobalSettings
}

interface State {
  opened : boolean
}

function anyBoxAllowed (whitelist : BoxesWhitelist) : boolean {
  return whitelist === ANY_BOX
}

function noBoxAllowed (whitelist : BoxesWhitelist) : boolean {
  return whitelist === NO_BOX
}

function isAllowed (type : BoxType, whitelist : BoxesWhitelist) : boolean {
  return anyBoxAllowed(whitelist) || (whitelist as Array<BoxType>).includes(type)
}

// TODO: this needs to change
// somehow I need to be able to delegate choosing the specific subtype of the Box
export default class CreateBox extends Component<Props, State> {
  constructor (props : Props) {
    super(props)

    this.state = {
      opened : false,
    }

    this.onOpen = this.onOpen.bind(this)
  }


  render () : JSX.Element {
    const { addNew, whiteList, settings } : Props = this.props
  
    const untLSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaState
  
    const addLambdaBoxIfAllowed = (allowed : boolean) => (
      allowed ?
        <div className='create-box--group'>
          <p
            className='plusBtn'
            title='Create new λ box'
            onClick={ () => {
              this.setState({ opened : false })
              addNew(createNewUntypedLambdaExpression(untLSettings)) }
            }
          >
            <i>{ ADD_BOX_LABEL } Expression</i>
          </p>
  
          <p
            className='plusBtn'
            title='Create new λ Exercise box'
            onClick={ () => {
              this.setState({ opened : false })
              addNew(createNewUntypedLambdaMacro(untLSettings)) }
            }
              >
            <i>{ ADD_BOX_LABEL } Macro</i>
          </p>
  
          <p
            className='plusBtn'
            title='Create new λ Macro box'
            onClick={ () => {
              this.setState({ opened : false })
              addNew(createNewUntypedLambdaExercise(untLSettings)) }
            }
              >
            <i>{ ADD_BOX_LABEL } Exercise</i>
          </p>
        </div>
        :
        null
    )
  
    const addLispBoxIfAllowed = (allowed : boolean) => (
      allowed ?
        <div className='create-box--group'>
          <p
            className='plusBtn'
            title='Create new Lisp box'
            onClick={ () => {
              this.setState({ opened : false })
              addNew({__key : Date.now().toString()} as BoxState) } // NOTE: just for now
            }
          >
            <i>+ Lisp</i>
          </p>
        </div>
        :
        null
    )
  
    const addMDBoxIfAllowed = (allowed : boolean) => (
      allowed ?
      <div className='create-box--group'>
        <p
          className='plusBtn'
          title='Create new MarkDown box'
          onClick={ () => {
            this.setState({ opened : false })
            addNew(createNewMarkdown()) }
          }
        >
          <i>+ MD</i>
        </p>
      </div>
      :
      null
    )

    if (this.state.opened) {
      return (
        noBoxAllowed(whiteList) ?
          null as any
          :
          <div className='create-box'>
            <div className='create-box--container'>
              { addLambdaBoxIfAllowed(isAllowed (BoxType.UNTYPED_LAMBDA, whiteList)) }
              { addLispBoxIfAllowed(isAllowed(BoxType.LISP, whiteList)) }
              { addMDBoxIfAllowed(isAllowed(BoxType.MARKDOWN, whiteList)) }
            </div>
          </div>
      )
    }
    
    return (
      <div className='create-box-plus'>
        <div className='create-box-plus--button' onClick={ this.onOpen }>
          <div className='create-box-plus--container'>
            <p>
              <i className="fas fa-plus" />
            </p>
          </div>
        </div>
      </div>
    )
  }

  onOpen () : void {
    this.setState({ opened : true })
  }
  
}
