import React, { PureComponent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { BoxType } from '../Types'
import { UntypedLambdaState, UntypedLambdaType, UntypedLambdaSettings, PromptPlaceholder, StepMessage, StepValidity } from './Types'
import ExpressionBox from './ExpressionBox'
import MacroList from './MacroList'
import { GLOBAL_SETTINGS_ENABLER, strategyToEvaluator, findSimplifiedReduction, toMacroMap } from './Constants'
import ExerciseBox from './ExerciseBox'
import Settings from './Settings'
import EmptyExpression from './EmptyExpression'
import { None, Evaluator, Token, tokenize, parse, AST, OptimizeEvaluator, MacroMap } from '@lambdulus/core'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean
  isAnchorBox : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
  titleActionsHost? : React.RefObject<HTMLSpanElement>
}

export default class UntypedLambdaBox extends PureComponent<Props> {
  constructor (props : Props) {
    super(props)

    this.onOutsideSettings = this.onOutsideSettings.bind(this)
  }

  componentDidMount () : void {
    document.addEventListener('mousedown', this.onOutsideSettings)
  }

  componentWillUnmount () : void {
    document.removeEventListener('mousedown', this.onOutsideSettings)
  }

  // An open settings panel closes on mousedown outside it — the same
  // beat the + rows open on. Exempt: the panel itself (any box's — panels
  // coexist), the gear (its toggle owns the click), and the tour (which
  // conducts panels deliberately step by step).
  onOutsideSettings (event : MouseEvent) : void {
    const { state, setBoxState } : Props = this.props

    if (state.settingsOpen !== true) {
      return
    }

    const target : Element | null = event.target as Element | null

    if (target === null || target.closest === undefined) {
      return
    }

    if (target.closest('.box-settings') !== null) {
      return
    }

    if (target.closest('[title="Open this Boxs\' settings"]') !== null) {
      return
    }

    if (target.closest('.tour') !== null) {
      return
    }

    setBoxState({ ...state, settingsOpen : false })
  }

  render () {
    const { state, isActive, isFocused, isAnchorBox, setBoxState, addBox, titleActionsHost } : Props = this.props
    const { settingsOpen, subtype, macrolistOpen, SLI, expandStandalones, strategy, SDE, collapseOldSteps, editor, minimized } : UntypedLambdaState = state


    const renderBoxContent = () => {
      switch (subtype) {
        case UntypedLambdaType.EMPTY:
          return (
            <EmptyExpression
              className='box boxEval'
              isActive={ isActive }
              isMinimized={ minimized }
              editor={ editor }
              state={ state }
              onContent={(content : string) =>
                setBoxState({
                  ...state,
                  editor : {
                    ...state.editor,
                    content,
                    syntaxError : null,
                  }
                })
              }
              onDebug={ () => this.onSubmitExpression(UntypedLambdaType.ORDINARY) }
              onExercise={ () => this.onSubmitExpression(UntypedLambdaType.EXERCISE) }
              setBoxState={ setBoxState }
            />
          )
  
        case UntypedLambdaType.ORDINARY:
          return (
            <ExpressionBox
              state={ state }
              isActive={ isActive }
              isFocused={ isFocused }
              isAnchorBox={ isAnchorBox }
              setBoxState={ setBoxState }
              addBox={ addBox }
              titleActionsHost={ titleActionsHost }
            />
          )
        
        case UntypedLambdaType.EXERCISE:
          return (
            <ExerciseBox
              state={ state }
              isActive={ isActive }
              isFocused={ isFocused }
              setBoxState={ setBoxState }
              addBox={ addBox }
            />
          )
      }
    }

    return (
      <div className='untypedLambdaBox'>
        {
          settingsOpen ?
            <div className='box-settings'>
              Settings:
              <Settings
                settings={ { type : BoxType.UNTYPED_LAMBDA, SLI, expandStandalones, strategy, SDE, collapseOldSteps : collapseOldSteps ?? true } }
                settingsEnabled={ GLOBAL_SETTINGS_ENABLER }

                change={ (settings : UntypedLambdaSettings) => {
                  setBoxState({
                    ...state,
                    ...settings
                  })
                } }
              />
            </div>
          :
            null
        }
        {
          // Macro dock: a persistent pill in the empty space left of the
          // box that unfolds into header plus scrolling middle. The
          // panel stays mounted and collapses through CSS, so opening
          // and closing animate instead of popping.
          <div className={ `macro-dock${ macrolistOpen ? ' macro-dock--open' : '' }` }>
            <button
              className='macro-dock--head'
              onClick={ () => setBoxState({ ...state, macrolistOpen : ! macrolistOpen }) }
              title={ macrolistOpen ? 'Hide macros for this box' : 'Show macros for this box' }
              aria-expanded={ macrolistOpen }
            >
              <span className='macro-dock--title'>Macros</span>
              { macrolistOpen ? <ChevronUp size={ 14 } strokeWidth={ 2 } /> : <ChevronDown size={ 14 } strokeWidth={ 2 } /> }
            </button>
            <div className='macro-dock--panel'>
              <div className='macro-dock--body'>
                <div className='macro-dock--scroll'>
                  <MacroList macroTable={ state.macrotable }  />
                </div>
              </div>
            </div>
          </div>
        }

        <div className='untypedLambdaBoxContent'>
          { renderBoxContent() }
        </div>

      </div>
    )
  }

  onSubmitExpression (subtype : UntypedLambdaType) : void {
    const { state, setBoxState } = this.props
    const {
      editor : { content },
      strategy,
      SDE,
      SLI,
    } = state

    try {
      const definitions : Array<string> = content.split(';')
      const expression : string = definitions.pop() || ""
      const macromap : MacroMap = toMacroMap(definitions, SLI)

      const ast : AST = this.parseExpression(expression, macromap)

      let message : StepMessage = { validity : StepValidity.CORRECT, userInput : '', message : '' }
      let isNormal = false

      const astCopy : AST = ast.clone()

      const nextReduction = (() => {
        if (SDE) {
          return findSimplifiedReduction(astCopy, strategy, macromap)[0]
        }
        else {
          const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
          return evaluator.nextReduction
        }
      })()

      
      if (nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

        if (etaEvaluator.nextReduction instanceof None) {
          isNormal = true
          message.message = 'Expression is in normal form.'
        }
      }

      setBoxState({
        ...state,
        settingsOpen : false,
        ast,
        subtype,
        expression : content,
        macrotable : macromap,
        history : [ {
          ast : ast.clone(),
          lastReduction : new None(),
          step : 0,
          message,
          isNormalForm : isNormal,
          exerciseStep : false,
        } ],
        editor : {
          content : content,
          placeholder : PromptPlaceholder.EVAL_MODE,
          syntaxError : null,
        }
      })
    } catch (exception) {
      let errorMessage : string = "Something is wrong with your expression. Please inspect it closely."
      console.error((exception as Error).toString())

      // if (errorMessage === "Error") {
        if (content.match(/:=/g)?.length !== content.match(/;/g)?.length) {
          errorMessage = "Did you forget to write a semicolon after the Macro definition?"
        }
        if (content.match(/\s*;\s*$/g)) {
          errorMessage = "There's a semicolon at the end."
        }
      // }

      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : new Error(errorMessage),
        }
      })
    }
  }

  // THROWS Exceptions
  parseExpression (expression : string, macrotable : MacroMap) : AST {
    // const { macroTable } = this.props

    const { SLI : singleLetterVars } = this.props.state

    const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars, macromap : macrotable })
    const ast : AST = parse(tokens, macrotable) // macroTable

    return ast
  }

}