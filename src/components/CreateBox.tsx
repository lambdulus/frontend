import React from 'react'

import { BoxState, BoxType, BoxesWhitelist, ANY_BOX, NO_BOX } from '../AppTypes'
import { createNewUntypedLambda, ADD_BOX_LABEL } from '../untyped-lambda-integration/AppTypes'


interface Props {
  addNew : (box : BoxState) => void,
  whiteList : BoxesWhitelist,
}

function anyBoxAllowed (whitelist : BoxesWhitelist) : boolean {
  return whitelist === ANY_BOX
}

function noBoxAllowed (whitelist : BoxesWhitelist) : boolean {
  return whitelist === NO_BOX
}

function isAllowed (type : BoxType, whitelist : BoxesWhitelist) : boolean {
  console.log(whitelist)
  return anyBoxAllowed(whitelist) || (whitelist as Array<BoxType>).includes(type)
}

export function CreateBox (props : Props) : JSX.Element {
  const { addNew, whiteList } : Props = props

  const addLambdaBoxIfAllowed = (allowed : boolean) => (
    allowed ?
      <p
        className='plusBtn'
        title='Create new λ box'
        onClick={ () => props.addNew(createNewUntypedLambda()) } // TODO: some imported function from the Integration -- like Integration.CreateNewBox()
      >
        <i>{ ADD_BOX_LABEL }</i>
      </p>
      :
      null
  )

  const addLispBoxIfAllowed = (allowed : boolean) => (
    allowed ?
      <p
        className='plusBtn'
        title='Create new Lisp box'
        onClick={ () => props.addNew({type : BoxType.UNTYPED_LAMBDA, __key : Date.now()}) }
      >
        <i>+ Lisp</i>
      </p>
      :
      null
  )

  const addMDBoxIfAllowed = (allowed : boolean) => (
    allowed ?
    <p
      className='plusBtn'
      title='Create new MarkDown box'
      onClick={ () => props.addNew({type : BoxType.UNTYPED_LAMBDA, __key : Date.now()}) }
    >
      <i>+ MD</i>
    </p>
    :
    null
  )

  return (
    noBoxAllowed(whiteList) ?
      null as any
      :
      <div className='addBoxArea'>
        <div className='addButtons'>
          { addLambdaBoxIfAllowed(isAllowed (BoxType.UNTYPED_LAMBDA, whiteList)) }
          { addLispBoxIfAllowed(isAllowed(BoxType.LISP, whiteList)) }
          { addMDBoxIfAllowed(isAllowed(BoxType.MARKDOWN, whiteList)) }
        </div>
      </div>
  )
}
