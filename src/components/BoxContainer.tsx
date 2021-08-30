import React, { MouseEvent, PureComponent, Component } from 'react'
import { mapBoxTypeToStr } from '../Constants'
import Box from './Box'
import BoxTitleBar from './BoxTitleBar'
import { BoxState, GlobalSettings, BoxesWhitelist, BoxType } from '../Types'

import "../styles/BoxContainer.css"
import PickBoxTypeModal from './PickBoxTypeModal'


interface Props {
  isActiveBox : boolean
  isFocusedBox : boolean
  box : BoxState

  makeActive : () => void
  onBlur : () => void
  updateBoxState : (state : BoxState) => void
  removeBox : () => void
  addBoxBefore : (state : BoxState) => void
  addBoxAfter : (state : BoxState) => void
  settings : GlobalSettings
  whiteList : BoxesWhitelist
}

interface State {
  modalOpen : boolean
}

export class BoxContainer extends Component<Props, State> {
  constructor (props: Props) {
    super(props)

    this.state = {
      modalOpen : false
    }
  }

  render () : JSX.Element {
    const {
      isActiveBox,
      isFocusedBox,
      box,
      makeActive,
      onBlur,
      updateBoxState,
      addBoxBefore,
      addBoxAfter,
      removeBox
    } : Props = this.props
  
    const { settingsOpen } : BoxState = box

    const { modalOpen } = this.state
  
    const boxTypeClassName : string = mapBoxTypeToStr(box.type)
  
    return (
      <div>
        {
          modalOpen ?
            <PickBoxTypeModal
              addNew={ (box : BoxState) => {
                this.props.addBoxAfter(box)
                this.setState({ modalOpen : false })
              } }
              whiteList={ this.props.whiteList }
              settings={ this.props.settings }
            />
          :
            null
        }
  
  
        <div
          className={ `boxContainer ${ isActiveBox ? 'active' : 'inactive' } ${boxTypeClassName}` }
          onClick={ makeActive }
          onBlur={ onBlur }
        >
          <BoxTitleBar
            state={ box }
            isActive={ isActiveBox }
            isFocused={ isFocusedBox }
            removeBox={ (e : MouseEvent) => {
              e.stopPropagation()
              removeBox()
            } }
            updateBoxState={ updateBoxState }
            addBoxBefore={ addBoxBefore }
            addBoxAfter={ addBoxAfter }
            settings={ this.props.settings }
            whiteList={ this.props.whiteList }
          />
          
          <Box
            state={ box }
            isActive={ isActiveBox }
            isFocused={ isFocusedBox }
            updateBoxState={ updateBoxState }
            addBoxAfter={ addBoxAfter }
          />
        </div>
        <div className="add_box_after" onMouseDown={ () => this.setState({ modalOpen : true }) } >
          +
        </div>
      </div>
    )
  }
}