import React from 'react'
import { GlobalSettings, BoxState } from '../Types'
import { createNewMarkdown } from '../markdown-integration/AppTypes'
import { UntypedLambdaSettings, UntypedLambdaState } from '../untyped-lambda-integration/Types'
import { createNewUntypedLambdaExpression, ADD_BOX_LABEL, CODE_NAME as UNTYPED_CODE_NAME } from '../untyped-lambda-integration/AppTypes'


import '../styles/PickBoxTypeModal.css'


interface Props {
  addNew (box : BoxState) : void
  settings : GlobalSettings
}


export default function PickBoxTypeModal (props : Props) : JSX.Element {
  const { addNew, settings } : Props = props

  const untLSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaState

  const addLambdaBox = (
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
  )

  // const addLispBox = (
  //   <div className='add-box--group'
  //     onClick={ (e) => {
  //       e.stopPropagation()
  //       // this.setState({ opened : false })
  //       addNew({__key : Date.now().toString()} as BoxState) } // NOTE: just for now
  //     }
  //   >
  //     <div
  //       className='plusBtn'
  //       title='Create new Lisp box'
  //     >
  //       <p className='create-box--big'>()</p>
  //       <p className='creat-box--label'>+ Lisp</p>
  //     </div>
  //   </div>
  // )

  const addMDBox = (
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
  )

  return (
    <div className='box-top-bar--modal--pick-box-type'>
      <div className='modal--create-box'>
        <div className='modal--create-box--container'>
          { addLambdaBox }
          {/* { addLispBox } */}
          { addMDBox }
        </div>
      </div>
    </div>
  )
}