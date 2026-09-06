import React, { MouseEvent, Component } from 'react'
import { mapBoxTypeToStr } from '../Constants'
import Box from './Box'
import BoxTitleBar from './BoxTitleBar'
import { BoxState } from '../Types'

import "../styles/BoxContainer.css"
import PickBoxTypeModal from './PickBoxTypeModal'


interface Props {
  isActiveBox : boolean
  isFocusedBox : boolean
  box : BoxState

  seatBox : () => void
  onBlur : () => void
  updateBoxState : (state : BoxState) => void
  removeBox : () => void
  addBoxBefore : (state : BoxState) => void
  addBoxAfter : (state : BoxState) => void
}

interface State {
  modalOpen : boolean
}

export class BoxContainer extends Component<Props, State> {
  private modalRef : React.RefObject<HTMLDivElement>
  private rootRef : React.RefObject<HTMLDivElement>

  constructor (props: Props) {
    super(props)

    this.modalRef = React.createRef<HTMLDivElement>()
    this.rootRef = React.createRef<HTMLDivElement>()
    this.state = {
      modalOpen : false
    }
  }

  getSnapshotBeforeUpdate (prevProps : Props) : number | null {
    // Focus transitions own the page scroll (Notebook seats the newly
    // focused box), so only glue the viewport across plain resizes.
    if (prevProps.isFocusedBox !== this.props.isFocusedBox) {
      return null
    }

    const el : HTMLDivElement | null = this.rootRef.current
    return el === null ? null : el.getBoundingClientRect().top
  }

  componentDidUpdate (_prevProps : Props, prevState : State, snapshot : number | null) : void {
    // The add-box dialog opens below the button; nudge the page just
    // enough to bring the whole dialog into view.
    if ( ! prevState.modalOpen && this.state.modalOpen && this.modalRef.current !== null) {
      this.modalRef.current.scrollIntoView({ block : 'nearest', behavior : 'smooth' })
    }

    // Pin the box where it was on screen: when this box resizes itself
    // (a settings toggle collapsing the history!), the page would
    // otherwise jump as clamping and anchoring kick in.
    if (snapshot !== null) {
      const el : HTMLDivElement | null = this.rootRef.current
      if (el !== null) {
        const drift : number = el.getBoundingClientRect().top - snapshot
        if (Math.abs(drift) > 0.5) {
          window.scrollBy({ top : drift, behavior : 'auto' })
        }
      }
    }
  }

  render () : JSX.Element {
    const {
      isActiveBox,
      isFocusedBox,
      box,
      seatBox,
      onBlur,
      updateBoxState,
      addBoxBefore,
      addBoxAfter,
      removeBox,
    } : Props = this.props
  
    const { modalOpen } = this.state
  
    const boxTypeClassName : string = mapBoxTypeToStr(box.type)
  
    return (
      <div ref={ this.rootRef }>
        <div
          className={ `boxContainer ${ isActiveBox ? 'active' : 'inactive' } ${boxTypeClassName}` }
          onBlur={ onBlur }
        >
          <BoxTitleBar
            state={ box }
            isActive={ isActiveBox }
            isFocused={ isFocusedBox }
            seatBox={ seatBox }
            removeBox={ (e : MouseEvent) => {
              e.stopPropagation()
              removeBox()
            } }
            updateBoxState={ updateBoxState }
            addBoxBefore={ addBoxBefore }
            addBoxAfter={ addBoxAfter }
          />
          
          <Box
            state={ box }
            isActive={ isActiveBox }
            isFocused={ isFocusedBox }
            updateBoxState={ updateBoxState }
            addBoxAfter={ addBoxAfter }
          />
        </div>

        {
          modalOpen ?
            <div ref={ this.modalRef }>
              <PickBoxTypeModal
                addNew={ (box : BoxState) => {
                  this.props.addBoxAfter(box)
                  this.setState({ modalOpen : false })
                } }
              />
            </div>
          :
          <div className="add_box_after" onMouseDown={ () => this.setState({ modalOpen : true }) } >
            +
          </div>
        }
      </div>
    )
  }
}