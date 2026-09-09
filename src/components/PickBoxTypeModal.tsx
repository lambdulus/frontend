import React from 'react'
import { FileText } from 'lucide-react'
import { BoxState } from '../Types'
import { createNewMarkdown } from '../markdown-integration/AppTypes'
import { UntypedLambdaSettings, UntypedLambdaState } from '../untyped-lambda-integration/Types'
import { createNewUntypedLambdaExpression, ADD_BOX_LABEL, CODE_NAME as UNTYPED_CODE_NAME } from '../untyped-lambda-integration/Constants'


import '../styles/PickBoxTypeModal.css'
import { SettingsContext } from '../contexts/Settings'


interface Props {
  addNew (box : BoxState) : void
}


export default function PickBoxTypeModal (props : Props) : JSX.Element {
  const { addNew } : Props = props

  const addLambdaBox = (
    <SettingsContext.Consumer>
      {
        settings => {
          const untLSettings : UntypedLambdaSettings = settings[UNTYPED_CODE_NAME] as UntypedLambdaState
          return  <div className='add-box--group'
                    onClick={ (e) => {
                      e.stopPropagation()
                      // this.setState({ opened : false })
                      addNew(createNewUntypedLambdaExpression(untLSettings)) }
                    }
                    title='Create new λ box'
                  >
                    <span className='add-box--glyph'>λ</span>
                    <span className='add-box--text'>
                      <span className='add-box--title'>{ ADD_BOX_LABEL }</span>
                      <span className='add-box--subtitle'>Evaluate and step through expressions</span>
                    </span>
                  </div>
        }
      }
    </SettingsContext.Consumer>
  )

  const addMDBox = (
    <div className='add-box--group'
      onClick={ (e) => {
        e.stopPropagation()
        // this.setState({ opened : false })
        addNew(createNewMarkdown()) }
      }
      title='Create new MarkDown box'
    >
      <span className='add-box--glyph'>
        <FileText size={ 22 } strokeWidth={ 1.75 } />
      </span>
      <span className='add-box--text'>
        <span className='add-box--title'>+ Markdown</span>
        <span className='add-box--subtitle'>Write notes between expressions</span>
      </span>
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