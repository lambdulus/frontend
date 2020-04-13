import React from 'react'

import { BoxState, BoxType } from '../AppTypes'
import { createNewUntypedLambda} from '../untyped-lambda-integration/AppTypes'


interface Props { addNew : (box : BoxState) => void }

export function CreateBox (props : Props) : JSX.Element {
  return (
    <div className='addButtons'>
      <p
        className='plusBtn'
        title='Create new λ box'
        onClick={ () => props.addNew(createNewUntypedLambda()) } // TODO: some imported function from the Integration -- like Integration.CreateNewBox()
      >
        <i>+ λ</i>
      </p>
      <p
        className='plusBtn'
        title='Create new Lisp box'
        onClick={ () => props.addNew({type : BoxType.UNTYPED_LAMBDA, __key : Date.now()}) }
      >
        <i>+ Lisp</i>
      </p>
      <p
        className='plusBtn'
        title='Create new MarkDown box'
        onClick={ () => props.addNew({type : BoxType.UNTYPED_LAMBDA, __key : Date.now()}) }
      >
        <i>+ MD</i>
      </p>
    </div>
  )
}
