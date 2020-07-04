import React from 'react'

import { ANY_BOX, NO_BOX } from '../AppTypes'
import { BoxType, BoxesWhitelist, BoxState, GlobalSettings } from '../Types'
import { createNewUntypedLambdaExercise, createNewUntypedLambdaExpression, createNewUntypedLambdaMacro, ADD_BOX_LABEL, CODE_NAME as UNTYPED_CODE_NAME } from '../untyped-lambda-integration/AppTypes'
import { UntypedLambdaSettings, UntypedLambdaState } from '../untyped-lambda-integration/Types'
import { createNewMarkdown } from '../markdown-integration/AppTypes'


interface Props {
  addNew : (box : BoxState) => void,
  whiteList : BoxesWhitelist,
  settings : GlobalSettings
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
export function CreateBox (props : Props) : JSX.Element {
  const { addNew, whiteList, settings } : Props = props

  const untLSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaState

  const addLambdaBoxIfAllowed = (allowed : boolean) => (
    allowed ?
      <div>
        <p
          className='plusBtn'
          title='Create new λ box'
          onClick={ () => addNew(createNewUntypedLambdaExpression(untLSettings)) } // TODO: some imported function from the Integration -- like Integration.CreateNewBox()
        >
          <i>{ ADD_BOX_LABEL }</i>
        </p>

        <p
          className='plusBtn'
          title='Create new λ Macro box'
          onClick={ () => addNew(createNewUntypedLambdaMacro(untLSettings)) } // TODO: some imported function from the Integration -- like Integration.CreateNewBox()
        >
          <i>{ ADD_BOX_LABEL } Macro</i>
        </p>
      </div>
      :
      null
  )

  const addLispBoxIfAllowed = (allowed : boolean) => (
    allowed ?
      <p
        className='plusBtn'
        title='Create new Lisp box'
        onClick={ () => addNew({__key : Date.now().toString()} as BoxState) } // NOTE: just for now
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
      onClick={ () => addNew(createNewMarkdown()) }
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
