import React, { PureComponent } from 'react'

import { BoxType } from '../Types'
import { UntypedLambdaState, UntypedLambdaType, UntypedLambdaSettings, PromptPlaceholder, StepMessage, StepValidity } from './Types'
import ExpressionBox from './ExpressionBox'
import MacroList from './MacroList'
import { GLOBAL_SETTINGS_ENABLER, strategyToEvaluator, findSimplifiedReduction, toMacroMap } from './AppTypes'
import ExerciseBox from './ExerciseBox'
import Settings from './Settings'
import EmptyExpression from './EmptyExpression'
import { reportEvent } from '../misc'
import { None, Evaluator, Token, tokenize, parse, AST, OptimizeEvaluator, MacroMap } from '@lambdulus/core'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
}

export default class UntypedLambdaBox extends PureComponent<Props> {
  render () {
    const { state, isActive, isFocused, setBoxState, addBox } : Props = this.props
    const { settingsOpen, subtype, macrolistOpen, SLI, expandStandalones, strategy, SDE, editor, minimized } : UntypedLambdaState = state


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
              setBoxState={ setBoxState }
              addBox={ addBox }
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
      <div
        ref={ (elem : any) => {
          // This is just temporary
          // should be replaced with much finer logic
          // like: store ref to the state and then scroll to the part of the Box which should be visible
          // depending on the action user just did
          // for now - it will do
          if (elem !== null && isActive) {
            const boundingRect = elem.getBoundingClientRect()
            const viewportHeight : number = window.innerHeight
            if (boundingRect.bottom > viewportHeight) {
              elem.scrollIntoView(false)
            }
          }
        } }
      >
        {
          settingsOpen ?
            <div className='box-settings'>
              Settings:
              <Settings
                settings={ { type : BoxType.UNTYPED_LAMBDA, SLI, expandStandalones, strategy, SDE } }
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
          macrolistOpen ?
            <div className='untyped-lambda-box--macrolist'>
              <MacroList macroTable={ state.macrotable }  />
            </div>
          :
            null
        }

        <div>
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
          reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())
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

      reportEvent('Submit Expression', 'submit valid', content)
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

      reportEvent('Submit Expression', 'submit invalid', content)
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