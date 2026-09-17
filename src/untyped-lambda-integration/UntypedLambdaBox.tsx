import React, { PureComponent } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { BoxType } from '../Types'
import { UntypedLambdaState, UntypedLambdaType, UntypedLambdaSettings, PromptPlaceholder, StepMessage, StepValidity } from './Types'
import ExpressionBox from './ExpressionBox'
import MacroList from './MacroList'
import { GLOBAL_SETTINGS_ENABLER, strategyToEvaluator, findSimplifiedReduction, toMacroMap, SETTINGS_OPENED_EVENT, coreErrorMessage } from './Constants'
import ExerciseBox from './ExerciseBox'
import Settings from './Settings'
import EmptyExpression from './EmptyExpression'
import { None, Evaluator, Token, tokenize, parse, AST, OptimizeEvaluator, MacroMap, OpenMacroDefinition } from '@lambdulus/core'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean
  isAnchorBox : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
  makeActive () : void
  titleActionsHost? : React.RefObject<HTMLSpanElement>
}

// How long a closing dock keeps its contained shut state before the
// pill stands alone: past the close beat with room to spare.
const DOCK_SHUT_MS : number = 160

// The dock keeps its open containment through a close (open + shut)
// so the fade plays inside the capped card instead of flashing the
// full-height content; reopening mid-shut drops the bridge at once.
export function dockClassName (macrolistOpen : boolean, shutting : boolean) : string {
  const contain : boolean = macrolistOpen || shutting
  const bridge : boolean = shutting && !macrolistOpen
  return `macro-dock${contain ? ' macro-dock--open' : ''}${bridge ? ' macro-dock--shut' : ''}`
}

interface State {
  dockShutting : boolean
}

export default class UntypedLambdaBox extends PureComponent<Props, State> {
  private dockShutTimer : number | null = null
  private boxRef = React.createRef<HTMLDivElement>()

  constructor (props : Props) {
    super(props)

    this.state = { dockShutting : false }
    this.onOutsideSettings = this.onOutsideSettings.bind(this)
    this.onOtherSettingsOpened = this.onOtherSettingsOpened.bind(this)
  }

  componentDidMount () : void {
    document.addEventListener('mousedown', this.onOutsideSettings)
    document.addEventListener(SETTINGS_OPENED_EVENT, this.onOtherSettingsOpened as EventListener)
  }

  componentWillUnmount () : void {
    document.removeEventListener('mousedown', this.onOutsideSettings)
    document.removeEventListener(SETTINGS_OPENED_EVENT, this.onOtherSettingsOpened as EventListener)

    if (this.dockShutTimer !== null) {
      window.clearTimeout(this.dockShutTimer)
      this.dockShutTimer = null
    }
  }

  componentDidUpdate (prevProps : Props) : void {
    if (prevProps.state.macrolistOpen && !this.props.state.macrolistOpen) {
      // Bridging the close: hold containment for the fade, then stand down.
      if (this.dockShutTimer !== null) {
        window.clearTimeout(this.dockShutTimer)
      }

      this.setState({ dockShutting : true })
      this.dockShutTimer = window.setTimeout(() => {
        this.dockShutTimer = null
        this.setState({ dockShutting : false })
      }, DOCK_SHUT_MS)
    }

    if (!prevProps.state.macrolistOpen && this.props.state.macrolistOpen && this.dockShutTimer !== null) {
      // Reopened mid-shut: the open state owns containment again.
      window.clearTimeout(this.dockShutTimer)
      this.dockShutTimer = null
      this.setState({ dockShutting : false })
    }
  }

  // An open settings panel closes on mousedown outside it — the same
  // beat the + rows open on. Exempt: my own panel, the gear (its toggle
  // owns the click), and the tour (which conducts panels deliberately
  // step by step). Another box's panel is "anywhere beside" mine, so it
  // dismisses me; a box opening its settings broadcasts, which buries me
  // even before any click lands (see onOtherSettingsOpened).
  onOutsideSettings (event : MouseEvent) : void {
    const { state, setBoxState } : Props = this.props

    if (state.settingsOpen !== true) {
      return
    }

    const target : Element | null = event.target as Element | null

    if (target === null || target.closest === undefined) {
      return
    }

    const panel : Element | null = target.closest('.box-settings')

    if (panel !== null && this.boxRef.current !== null && this.boxRef.current.contains(panel)) {
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

  // Another box opened its settings — stand mine down so panels never overlap.
  onOtherSettingsOpened (event : Event) : void {
    const { state, setBoxState } : Props = this.props
    const key : unknown = (event as CustomEvent<{ key : string }>).detail?.key

    if (state.settingsOpen === true && typeof key === 'string' && key !== state.__key) {
      setBoxState({ ...state, settingsOpen : false })
    }
  }

  render () {
    const { state, isActive, isFocused, isAnchorBox, setBoxState, addBox, makeActive, titleActionsHost } : Props = this.props
    const { settingsOpen, subtype, macrolistOpen, SLI, expandStandalones, strategy, SDE, ETA, collapseOldSteps, editor, minimized, history, submittedWith } : UntypedLambdaState = state

    // A submitted session stepped under different strategy/SLI/SDE can
    // restart from scratch with the current ones. ETA never dirties:
    // it reopens stepping at normal form on its own.
    const restartNeeded : boolean =
      (history ?? []).length > 0
      && submittedWith !== undefined
      && (submittedWith.strategy !== strategy || submittedWith.SLI !== SLI || submittedWith.SDE !== SDE)


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
      <div className='untypedLambdaBox' ref={ this.boxRef }>
        {
          settingsOpen ?
            <div className='box-settings'>
              Settings:
              <Settings
                settings={ { type : BoxType.UNTYPED_LAMBDA, SLI, expandStandalones, strategy, SDE, ETA : ETA ?? false, collapseOldSteps : collapseOldSteps ?? true } }
                settingsEnabled={ GLOBAL_SETTINGS_ENABLER }
                restartNeeded={ restartNeeded }
                onRestart={ () => this.onSubmitExpression(subtype) }

                change={ (settings : UntypedLambdaSettings) => {
                  // Enabling ETA at normal form reopens stepping when an
                  // eta step is possible -- without performing it; the
                  // user decides. Every other toggle just applies (pre
                  // normal form the live setting takes effect on its own,
                  // and disabling at normal form undoes nothing).
                  if (settings.ETA === true && state.ETA !== true) {
                    const last = state.history[state.history.length - 1]
                    if (last !== undefined && last.ast !== null && last.isNormalForm === true) {
                      const etaEvaluator : Evaluator = new OptimizeEvaluator(last.ast)
                      if (! (etaEvaluator.nextReduction instanceof None)) {
                        setBoxState({
                          ...state,
                          ...settings,
                          history : [
                            ...state.history.slice(0, -1),
                            { ...last, isNormalForm : false, message : { ...last.message, message : '' } },
                          ],
                        })
                        return
                      }
                    }
                  }
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
          <div className={ dockClassName(macrolistOpen, this.state.dockShutting && !macrolistOpen) }>
            <button
              className='macro-dock--head'
              // The head remembers, not just toggles: focus syncs restore
              // this wish on refocus and never invent one of their own.
              onClick={ (e) => {
                // Focus first, toggle second, never bubble: the bubbled
                // focus sync recomputes docks from pre-toggle props and
                // swallows the toggle on an unfocused box — always, in
                // zen, which restores nothing. Ordered by hand, the
                // toggle commits last and wins, and the box owns the
                // focus afterwards like every other control click.
                e.stopPropagation()
                makeActive()
                setBoxState({ ...state, macrolistOpen : ! macrolistOpen, macrolistWanted : ! macrolistOpen })
              } }
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
      ETA,
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
          const evaluator : Evaluator = new (strategyToEvaluator(strategy))(astCopy)
          return evaluator.nextReduction
        }
      })()

      if (nextReduction instanceof None) {
        const etaEvaluator : Evaluator = new OptimizeEvaluator(ast)

        if (etaEvaluator.nextReduction instanceof None || ! ETA) {
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
        submittedWith : { strategy, SDE, ETA, SLI },
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
      // Core reports open macro definitions as a typed error carrying
      // the macro name and its free variables -- show it as is.
      // Anything else falls back to core's own message.
      let errorMessage : string = exception instanceof OpenMacroDefinition
        ? exception.message
        : coreErrorMessage(exception)
      console.error(coreErrorMessage(exception))

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