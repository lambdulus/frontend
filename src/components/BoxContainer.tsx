import React, { MouseEvent, Component } from 'react'
import { mapBoxTypeToStr } from '../Constants'
import Box from './Box'
import BoxTitleBar from './BoxTitleBar'
import { BoxState, BoxType } from '../Types'

import "../styles/BoxContainer.css"
import PickBoxTypeModal from './PickBoxTypeModal'


interface Props {
  isActiveBox : boolean
  isFocusedBox : boolean
  isAnchorBox : boolean
  zen : boolean
  box : BoxState

  seatBox : () => void
  makeActive : () => void
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
  private titleActionsRef : React.RefObject<HTMLSpanElement>

  constructor (props: Props) {
    super(props)

    this.modalRef = React.createRef<HTMLDivElement>()
    this.rootRef = React.createRef<HTMLDivElement>()
    this.titleActionsRef = React.createRef<HTMLSpanElement>()
    this.state = {
      modalOpen : false
    }
  }

  getSnapshotBeforeUpdate (prevProps : Props) : { top : number, height : number } | null {
    // Focus transitions own the page scroll (Notebook seats the newly
    // focused box), so only glue the viewport across plain resizes.
    if (prevProps.isFocusedBox !== this.props.isFocusedBox) {
      return null
    }
    // A zen flip intentionally reflows the whole page (the title and
    // the siblings step in or out): pinning across it would scroll
    // the page, and the scroll-prime sync would re-derive focus from
    // the mid-flip geometry, usually onto the last box. Notebook
    // seats the anchor explicitly on the flip instead.
    if (prevProps.zen !== this.props.zen) {
      return null
    }

    const el : HTMLDivElement | null = this.rootRef.current
    if (el === null) {
      return null
    }
    const rect : DOMRect = el.getBoundingClientRect()
    return { top : rect.top, height : rect.height }
  }

  componentDidUpdate (_prevProps : Props, prevState : State, snapshot : { top : number, height : number } | null) : void {
    // The add-box dialog opens below the button; nudge the page just
    // enough to bring the whole dialog into view.
    if ( ! prevState.modalOpen && this.state.modalOpen && this.modalRef.current !== null) {
      this.modalRef.current.scrollIntoView?.({ block : 'nearest', behavior : 'smooth' })
    }

    // Pin the box where it was on screen, but only across its own
    // resize (a settings toggle collapsing the history!). Displacement
    // by content above -- a sibling's new step line pushing this box
    // down -- belongs to the browser's scroll anchoring: pinning here
    // would scroll once per box below the change, fighting the native
    // compensation as a per-step jitter.
    if (snapshot !== null) {
      const el : HTMLDivElement | null = this.rootRef.current
      if (el !== null) {
        const rect : DOMRect = el.getBoundingClientRect()
        if (Math.abs(rect.height - snapshot.height) < 0.5) {
          return
        }
        const drift : number = rect.top - snapshot.top
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
      isAnchorBox,
      box,
      seatBox,
      makeActive,
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
          className={ `box-frame${ isFocusedBox ? ' box-frame--focused' : '' }${ isAnchorBox ? ' box-frame--anchor' : '' }` }
          data-box-key={ box.__key }
        >
          <div
            className="box-rail"
            title="Focus this box"
            onClick={ (e : MouseEvent) => {
              // Same as clicking the box itself, but the rail holds no
              // controls, so the click can never misfire into one.
              e.stopPropagation()
              makeActive()
            } }
          />
          <div
            className={ `boxContainer ${ isActiveBox ? 'active' : 'inactive' } ${boxTypeClassName}` }
            onClick={ makeActive }
            onBlur={ onBlur }
          >
            <BoxTitleBar
              state={ box }
              isActive={ isActiveBox }
              isFocused={ isFocusedBox }
              hideTitle={ box.type === BoxType.UNTYPED_LAMBDA || box.type === BoxType.MARKDOWN }
              titleActionsHost={ box.type === BoxType.UNTYPED_LAMBDA ? this.titleActionsRef : undefined }
              seatBox={ seatBox }
              makeActive={ makeActive }
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
              isAnchorBox={ isAnchorBox }
              updateBoxState={ updateBoxState }
              addBoxAfter={ addBoxAfter }
              titleActionsHost={ box.type === BoxType.UNTYPED_LAMBDA ? this.titleActionsRef : undefined }
            />
          </div>
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