// This component needs to be able to specify which Boxes are allowed inside
// It will also have other settings - maybe something like lock - if it's locked, you can not modify it
// Exam mode will feature the build of the Frontend which will not import any of the Evaluation Boxes


import React, { PureComponent } from 'react'
import CreateBox from '../components/CreateBox'
import { BoxType, NotebookState, GlobalSettings, BoxState } from '../Types'

import { onMarkDownBlur, NoteState, onMarkDownActive } from '../markdown-integration/AppTypes'
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
    this.insertAfter = this.insertAfter.bind(this)
    this.removeBox = this.removeBox.bind(this)
    this.updateBoxState = this.updateBoxState.bind(this)
    this.makeActive = this.makeActive.bind(this)
    this.onBlur = this.onBlur.bind(this)
    this.createBoxFromURL = this.createBoxFromURL.bind(this)
    this.setBoxState = this.setBoxState.bind(this)
  }

  componentDidMount () : void {
    this.createBoxFromURL()
  }

  render () {
    const { state, settings } = this.props
    const { activeBoxIndex, focusedBoxIndex, boxList, allowedBoxes } = state

    return (
      <div className="mainSpace">
        {/* TODO: This will be refactore out to standalone component. */}
        <ul className="boxList UL">
          { boxList.map(
            (box : BoxState, i : number) =>
            <li className="LI" key={ box.__key }>

              {/* <CreateBox
                addNew={ (box : BoxState) => this.insertBefore(i, box) }
                whiteList={ allowedBoxes }
                settings={ settings }
              /> */}

              <BoxContainer
                box={ box}
                isActiveBox={ activeBoxIndex === i}
                isFocusedBox={ focusedBoxIndex === i }
                addBoxBefore={ (box : BoxState) => this.insertBefore(i, box) }
                addBoxAfter={ (box : BoxState) => this.insertAfter(i, box) }
                makeActive={ () => this.makeActive(i) }
                removeBox={ () => this.removeBox(i) }
                updateBoxState={ (box : BoxState) => this.updateBoxState(i, box) }
                onBlur={ () => this.onBlur(i) }
                whiteList={ allowedBoxes }
                settings={ settings }
              />
            </li>
          ) }

          {
            boxList.length === 0 ?
              <CreateBox
                addNew={ (box : BoxState) => this.insertBefore(state.boxList.length, box) }
                whiteList={ allowedBoxes }
                settings={ settings }
              />
            :
            null
          }
        </ul>
      </div>
    )
  }

  /**
   * URL params:
   *  type : untyped-lambda | markdown | lisp | ... 
   *  specific : {
   *    SLI : nul
   *    strategy : normal | applicative | simplyfied
   *  }
   *  source : string
   */
  createBoxFromURL () {
    const urlSearchParams : URLSearchParams = new URL(window.location.toString()).searchParams
    const type : string | null = urlSearchParams.get('type')

    if (type === null) {
      return
    }

    // switch (type) {
    //   case BoxType.UNTYPED_LAMBDA: {

    //   }
        
    //   default:
    //     break;
    // }
    
    console.log(window.location.toString())
    console.log(urlSearchParams.get('type'))
    console.log(urlSearchParams.get('source'))




    // const hash : string = decodeURI(window.location.hash.substring(1))
    // const isExercise : boolean = hash.indexOf('exercise:') !== -1

    // const expression : string = isExercise ? hash.substring(9) : hash

    // if (expression === '') {
    //   // return
    // }

    // const box : BoxState = {
    //   type : BoxType.EXPRESSION,
    //   __key : Date.now().toString(),
    //   expression : '',
    //   ast : null,
    //   history : [],
    //   isRunning : false,
    //   breakpoints : [],
    //   timeoutID : undefined,
    //   timeout : 10,
    //   isExercise : isExercise,
    //   strategy : this.getActiveStrategy(),
    //   singleLetterNames : this.getActiveSingleLetterNames(),
    //   standalones : this.getActiveStandalones(),
    //   editor : {
    //     placeholder : PromptPlaceholder.INIT,
    //     content : expression,
    //     caretPosition : expression.length,
    //     syntaxError : null,
    //   }
    // }

    // this.setState({
    //   ...this.state,
    //   submittedBoxes : [ box ],
    //   activeBoxIndex : 0,
    // })
  }

  setBoxState (index : number, boxState : BoxState) : void {
    // const { submittedBoxes } = this.state
    
    // const expression : string = boxState.type === BoxType.EXPRESSION ? boxState.editor.content || (boxState as EvaluationState).expression : '' // TODO: DIRTY DIRTY BIG TIME
    // const expPrefix : string = boxState.type === BoxType.EXPRESSION && (boxState as EvaluationState).isExercise ? 'exercise:' : '' 
    
    // history.pushState({}, "page title?", "#" + expPrefix + encodeURI(expression))

    // // TODO: doresit update URL // ted uz to docela dobry je

    // // TODO: consider immutability
    // submittedBoxes[index] = boxState

    // this.setState({
    //   ...this.state,
    //   submittedBoxes,
    // })

  }

  insertBefore (index : number, box : BoxState) : void {
    const { boxList } = this.props.state

    const boxListCopy = [ ...boxList ]

    boxListCopy.splice(index, 0, box)

    this.props.updateNotebook({ ...this.props.state, boxList : boxListCopy, activeBoxIndex : index, focusedBoxIndex : index })
  }

  insertAfter (index : number, box : BoxState) : void {

    const { boxList } = this.props.state

    boxList.splice(index + 1, 0, box)
    this.props.updateNotebook({ ...this.props.state, boxList : boxList, activeBoxIndex : index + 1, focusedBoxIndex : index + 1})
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

  updateBoxState (index : number, box : BoxState) : void {
    const { boxList } = this.props.state
    boxList[index] = { ...box }


    this.props.updateNotebook({ ...this.props.state, boxList : [...boxList] })
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
      const futureType : BoxType = boxList[index].type

      const patch = {
        minimized : false,
      }

      switch (futureType) {
        case BoxType.MARKDOWN: {
          boxList[index] = {
            ...onMarkDownActive(boxList[index] as NoteState),
            ...patch,
          }
        }
          
        default: {
          boxList[index] = {
            ...boxList[index],
            ...patch
          }
        }
          break;
      }

      this.props.updateNotebook({ ...this.props.state, activeBoxIndex : index, focusedBoxIndex : index, boxList })
    }
  }

  onBlur (index : number) : void {
    // TODO: I may not need onBlur handling in the future
    // I am thinking - right now all it does is this:
    // it un-focuses currently focused Box
    // if this is not really needed - then maybe I should not have this feature
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
        // return // TODO: just for now
      }

      default:
        break
    }

    this.props.updateNotebook({ ...this.props.state, boxList, focusedBoxIndex : undefined })
  }
}