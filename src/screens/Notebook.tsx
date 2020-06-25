// This component needs to be able to specify which Boxes are allowed inside
// It will also have other settings - maybe something like lock - if it's locked, you can not modify it
// Exam mode will feature the build of the Frontend which will not import any of the Evaluation Boxes


import React, { PureComponent } from 'react'
import { CreateBox } from '../components/CreateBox'
import { BoxType, NotebookState, GlobalSettings, BoxState } from '../Types'

import { onMarkDownBlur, NoteState } from '../markdown-integration/AppTypes'
import { BoxContainer } from '../components/BoxContainer'

interface Props {
  state : NotebookState
  settings : GlobalSettings

  updateNotebook (notebook : NotebookState) : void
}

export default class Notebook extends PureComponent<Props> {
  constructor (props : Props) {
    super(props)

    this.insertBefore = this.insertBefore.bind(this)
    this.removeBox = this.removeBox.bind(this)
    this.updateBoxState = this.updateBoxState.bind(this)
    this.makeActive = this.makeActive.bind(this)
    this.onBlur = this.onBlur.bind(this)
  }

  render () {
    const { state, settings } = this.props
    const { activeBoxIndex, focusedBoxIndex, boxList, allowedBoxes } = state

    return (
      <div className="mainSpace">
        <div className='importExportSpace'>
          <div className='portContainer'>
            {/* TODO: SOLVE WHERE TO MOVE IMPORT/EXPORT */}
            <div
              className='exportButton'
              title='Download this notebook'>
              <a
                className='export'
                // href={ link }
                download="notebook_lambdulus.json"
                // onClick={ () => setTimeout(() => {
                //   window.URL.revokeObjectURL(link)
                //   reportEvent('Export notebook', `Notebook: ${serialized}`, '')
                // }, 10) }
              >
                <i id='download' className="icon dark fas fa-cloud-download-alt" />
              </a>
              <p className='iconLabel'>Export</p>
            </div>
            
            <div
              className='importButton'
              title='Open exported notebook'>
              <input type="file" accept="application/json" id="input"
              // onChange={ (e) => onFiles(e, onImport) }
              />
              <label htmlFor="input"><i className="icon dark fas fa-cloud-upload-alt"></i></label>
              <p className='iconLabel'>Import</p>
            </div>
          </div>
        </div>


        {/* TODO: This will be refactore out to standalone component. */}
        <ul className="boxList UL">
          { boxList.map(
            (box : BoxState, i : number) =>
            <li className="LI" key={ box.__key }>
              
              <CreateBox
                addNew={ (box : BoxState) => this.insertBefore(i, box) }
                whiteList={ allowedBoxes }
                settings={ settings }
              />
              
              <BoxContainer
                box={ box}
                isActiveBox={ activeBoxIndex === i}
                isFocusedBox={ focusedBoxIndex === i }
                insertBefore={ (box : BoxState) => this.insertBefore(i, box) }
                makeActive={ () => this.makeActive(i) }
                removeBox={ () => this.removeBox(i) }
                updateBoxState={ (box : BoxState) => this.updateBoxState(i, box) }
                onBlur={ () => this.onBlur(i) }
              />          
            </li>
          ) }
  
          <CreateBox
            addNew={ (box : BoxState) => this.insertBefore(state.boxList.length, box) }
            whiteList={ allowedBoxes }
            settings={ settings }
          />
  
        </ul>
      </div>
    )
  }

  insertBefore (index : number, box : BoxState) : void {
    console.log("              INSERT BEFORE " + index)
    const { boxList } = this.props.state

    boxList.splice(index, 0, box)
    this.props.updateNotebook({ ...this.props.state, boxList : boxList, activeBoxIndex : index, focusedBoxIndex : index })
  }

  removeBox (index : number) : void {
    const { boxList, activeBoxIndex } = this.props.state
    
    const nearestValidIndex = (i : number) => {
      if (i < activeBoxIndex) return activeBoxIndex - 1
      if (i > activeBoxIndex) return activeBoxIndex
      if (boxList.length === 1) return NaN
      if (i === 0) return i
      return i - 1
    }

    const newIndex : number = nearestValidIndex(index)

    boxList.splice(index, 1)
    this.props.updateNotebook({ ...this.props.state, boxList : boxList, activeBoxIndex : newIndex })
  }

  /**
   * This function is patching; not overriding
   * @param index 
   * @param box 
   */
  updateBoxState (index : number, box : BoxState) : void {
    const { boxList } = this.props.state
    boxList[index] = box

    this.props.updateNotebook({ ...this.props.state, boxList })
  }

  makeActive (index : number) : void {
    console.log("               MAKE ACTIVE " + index)
    const { activeBoxIndex, focusedBoxIndex, boxList } = this.props.state

    const currentType : BoxType = boxList[activeBoxIndex].type

    switch (currentType) {
      case BoxType.UNTYPED_LAMBDA:
        // boxList[activeBoxIndex] = onUntypedLambdaBlur(boxList[activeBoxIndex])
        break
      
      case BoxType.MARKDOWN: {
        boxList[activeBoxIndex] = onMarkDownBlur(boxList[activeBoxIndex] as NoteState)
        break
      }

      default:
        break
    }

    if (index !== activeBoxIndex || index !== focusedBoxIndex || boxList[index].minimized === true) {
      boxList[index].minimized = false;

      this.props.updateNotebook({ ...this.props.state, activeBoxIndex : index, focusedBoxIndex : index, boxList })
    }
  }

  onBlur (index : number) : void {
    console.log("                  BLUR " + index)
    const { boxList, activeBoxIndex } = this.props.state

    if (activeBoxIndex !== index) {
      return
    }

    const currentType : BoxType = boxList[index].type

    switch (currentType) {
      case BoxType.UNTYPED_LAMBDA:
        // boxList[activeBoxIndex] = onUntypedLambdaBlur(boxList[activeBoxIndex])
        break
      
      case BoxType.MARKDOWN: {
        boxList[index] = onMarkDownBlur(boxList[index] as NoteState)
        break
      }

      default:
        break
    }

    this.props.updateNotebook({ ...this.props.state, boxList, focusedBoxIndex : undefined })
  }
}