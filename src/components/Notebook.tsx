import React, { PureComponent } from 'react'
import { BoxState, NotebookState } from '../AppTypes'
import { CreateBox } from './CreateBox'
import BoxTopBar from '../untyped-lambda-integration/BoxTopBar'
import Box from './Box'

interface Props {
  state : NotebookState
  updateNotebook (notebook : NotebookState) : void
}

export default class Notebook extends PureComponent<Props> {
  constructor (props : Props) {
    super(props)

    this.insertBefore = this.insertBefore.bind(this)
    this.removeBox = this.removeBox.bind(this)
    this.updateBoxState = this.updateBoxState.bind(this)
  }

  render () {
    const { state } = this.props
    const { activeBoxIndex, boxList } = state

    return (
      <div className="mainSpace">
        {/* TODO: This will be refactore out to standalone component. */}
        <ul className="boxList UL">
          { boxList.map(
            (box : BoxState, i : number) =>
            <li className="LI" key={ box.__key }>
              
              {/* TODO: This will be refactored out to standalone component. */}
              <div className='addBoxArea'>
                <CreateBox addNew={ (box : BoxState) => this.insertBefore(i, box) } />
              </div>
              
              <div className={ `boxContainer${ i === activeBoxIndex ? ' active' : ' inactive' }` } >
                <BoxTopBar removeBox={ () => this.removeBox(i) } />
                <Box
                state={ box }
                isActive={ i === activeBoxIndex }
                updateBoxState={ (box : BoxState) => this.updateBoxState(i, box) }
                addBox={ (box : BoxState) => this.insertBefore(i + 1, box) } />
              </div>             
            </li>
          ) }
  
          {/* TODO: This will be refactored out to standalone component. */}
          <div className='addBoxArea'>
            <CreateBox addNew={ (box : BoxState) => this.insertBefore(state.boxList.length, box) } />
          </div>
  
        </ul>
      </div>
    )
  }

  insertBefore (index : number, box : BoxState) : void {
    const { boxList } = this.props.state
    
    boxList.splice(index, 0, box)
    this.props.updateNotebook({ ...this.props.state, boxList : boxList, activeBoxIndex : index })
  }

  removeBox (index : number) : void {
    const { boxList, activeBoxIndex } = this.props.state
    
    const nearestValidIndex = (i : number) => {
      if (activeBoxIndex !== i) return activeBoxIndex
      if (boxList.length === 1) return NaN
      if (i === 0) return i
      return i - 1
    }

    const newIndex : number = nearestValidIndex(index)

    boxList.splice(index, 1)
    this.props.updateNotebook({ ...this.props.state, boxList : boxList, activeBoxIndex : newIndex })
  }

  updateBoxState (index : number, box : BoxState) : void {
    const { boxList } = this.props.state
    boxList[index] = box

    this.props.updateNotebook({ ...this.props.state, boxList })
  }
}