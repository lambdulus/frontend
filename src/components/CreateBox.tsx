import React from 'react'

import { BoxState, BoxType } from '../AppTypes'


interface Props { addNew : (box : BoxState) => void }

export function CreateBox (props : Props) : JSX.Element {
  return (
    <div className='addButtons'>
      <p
        className='plusBtn'
        title='Create new λ expression'
        onClick={ () => props.addNew({type : BoxType.LAMBDA, __key : Date.now()}) } // TODO: some imported function from the Integration -- like Integration.CreateNewBox()
      >
        <i>+ λ</i>
      </p>
      <p
        className='plusBtn'
        title='Define new macro'
        onClick={ () => props.addNew({type : BoxType.LAMBDA, __key : Date.now()}) }
      >
        <i>+ Macro</i>
      </p>
      <p
        className='plusBtn'
        title='Write new Markdown note'
        onClick={ () => props.addNew({type : BoxType.LAMBDA, __key : Date.now()}) }
      >
        <i>+ MD</i>
      </p>
    </div>
  )
}
