import React from 'react'
import { GlobalSettings, BoxesWhitelist, BoxState, BoxType } from '../Types'
import { createNewMarkdown } from '../markdown-integration/AppTypes'
import { UntypedLambdaSettings, UntypedLambdaState } from '../untyped-lambda-integration/Types'
import { createNewUntypedLambdaExpression, ADD_BOX_LABEL, CODE_NAME as UNTYPED_CODE_NAME } from '../untyped-lambda-integration/AppTypes'
import { ANY_BOX, NO_BOX } from '../Constants'


import '../styles/PickBoxTypeModal.css'


function anyBoxAllowed (whitelist : BoxesWhitelist) : boolean {
  return whitelist === ANY_BOX
}

function noBoxAllowed (whitelist : BoxesWhitelist) : boolean {
  return whitelist === NO_BOX
}

function isAllowed (type : BoxType, whitelist : BoxesWhitelist) : boolean {
  return anyBoxAllowed(whitelist) || (whitelist as Array<BoxType>).includes(type)
}

interface Props {
  addNew (box : BoxState) : void
  whiteList : BoxesWhitelist
  settings : GlobalSettings
}


export default function PickBoxTypeModal (props : Props) : JSX.Element {
  const { addNew, whiteList, settings } : Props = props

  const untLSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaState

  const addLambdaBoxIfAllowed = (allowed : boolean) => (
    allowed ?
      <div className='add-box--group'
        onClick={ (e) => {
          e.stopPropagation()
          // this.setState({ opened : false })
          addNew(createNewUntypedLambdaExpression(untLSettings)) }
        }
      >
        <div
          className='plusBtn'
          title='Create new λ box'
        >
          <p className='create-box--big'>λ</p>
          <p className='creat-box--label'>{ ADD_BOX_LABEL }</p>
        </div>
      </div>
      :
      null
  )

  const addLispBoxIfAllowed = (allowed : boolean) => (
    allowed ?
      <div className='add-box--group'
        onClick={ (e) => {
          e.stopPropagation()
          // this.setState({ opened : false })
          addNew({__key : Date.now().toString()} as BoxState) } // NOTE: just for now
        }
      >
        <div
          className='plusBtn'
          title='Create new Lisp box'
        >
          <p className='create-box--big'>()</p>
          <p className='creat-box--label'>+ Lisp</p>
        </div>
      </div>
      :
      null
  )

  const addMDBoxIfAllowed = (allowed : boolean) => (
    allowed ?
    <div className='add-box--group'
      onClick={ (e) => {
        e.stopPropagation()
        // this.setState({ opened : false })
        addNew(createNewMarkdown()) }
      }
    >
      <div
        className='plusBtn'
        title='Create new MarkDown box'
      >
        <p className='create-box--big'>M&darr;</p>
        <p className='creat-box--label'>+ Markdown</p>
      </div>
    </div>
    :
    null
  )

  return (
    <div className='box-top-bar--modal--pick-box-type'>
      {
        noBoxAllowed(whiteList) ?
          <h4>No Boxes Allowed</h4>
          :
          <div
            className='modal--create-box'
          >
            <div className='modal--create-box--container'>
              { addLambdaBoxIfAllowed(isAllowed (BoxType.UNTYPED_LAMBDA, whiteList)) }
              { addLispBoxIfAllowed(isAllowed(BoxType.LISP, whiteList)) }
              { addMDBoxIfAllowed(isAllowed(BoxType.MARKDOWN, whiteList)) }
            </div>
          </div>
      }
    </div>
  )
}