import React, { PureComponent } from 'react'

import { BoxState, BoxType } from '../Types'
import { UntypedLambdaState, UntypedLambdaType, UntypedLambdaExpressionState, UntypedLambdaSettings, PromptPlaceholder, EvaluationStrategy } from './Types'
import ExpressionBox from './ExpressionBox'
// import Macro from './Macro'
import MacroList from './MacroList'
import { UNTYPED_LAMBDA_INTEGRATION_STATE, GLOBAL_SETTINGS_ENABLER, strategyToEvaluator } from './AppTypes'
import ExerciseBox from './ExerciseBox'
import Settings from './Settings'
import EmptyExpression from './EmptyExpression'
import { reportEvent } from '../misc'
import { None, Evaluator, Token, tokenize, parse, AST, NormalEvaluator, ApplicativeEvaluator, OptimizeEvaluator, NormalAbstractionEvaluator, MacroMap } from '@lambdulus/core'

// import macroctx from './MacroContext'


interface Props {
  state : UntypedLambdaState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : UntypedLambdaState) : void
  addBox (box : UntypedLambdaState) : void
}

export default class UntypedLambdaBox extends PureComponent<Props> {
  constructor (props : Props) {
    super(props)
  }

  render () {
    const { state, isActive, isFocused, setBoxState, addBox } : Props = this.props
    const { settingsOpen, subtype, macrolistOpen, SLI, expandStandalones, strategy, SDE, editor } : UntypedLambdaState = state


    const renderBoxContent = () => {
      switch (subtype) {
        case UntypedLambdaType.EMPTY:
          return (
            <EmptyExpression
              className='box boxEval'
              isActive={ isActive }
              editor={ editor }
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
            />
          )
  
        case UntypedLambdaType.ORDINARY:
          return (
            <ExpressionBox
              state={ state }
              isActive={ isActive }
              isFocused={ isFocused }
              macroContext={ UNTYPED_LAMBDA_INTEGRATION_STATE }
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
              macroContext={ UNTYPED_LAMBDA_INTEGRATION_STATE }
              setBoxState={ setBoxState }
              addBox={ addBox }
            />
          )
      }
    }

    return (
      <div>
        {
          settingsOpen ?
            <div className='box-settings'>
              Box Local Settings:
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
              {/* // TODO: this will just get this? */}
            </div>
          :
            null
        }

        { renderBoxContent() }

      </div>
    )
  }

  onSubmitExpression (subtype : UntypedLambdaType) : void {
    const { state, setBoxState } = this.props
    const {
      editor : { content },
      strategy,
    } = state

    const definitions : Array<string> = content.split(';')
    const expression : string = definitions.pop() || ""
    const macromap : MacroMap = toMacroMap(definitions)
    
    try {
      const ast : AST = this.parseExpression(expression, macromap)

      let message = ''
      let isNormal = false

      const astCopy : AST = ast.clone()
      const evaluator : Evaluator = new (strategyToEvaluator(strategy) as any)(astCopy)
      
      if (evaluator.nextReduction instanceof None) {
        isNormal = true
        message = 'Expression is in normal form.'
        
        // reportEvent('Evaluation Step', 'Step Normal Form Reached', ast.toString())  
      }

      setBoxState({
        ...state,
        ast,
        subtype,
        expression : content,
        macrotable : macromap,
        history : [ {
          ast : ast.clone(),
          lastReduction : new None,
          step : 0,
          message,
          isNormalForm : isNormal
        } ],
        editor : {
          content : '',
          caretPosition : 0,
          placeholder : PromptPlaceholder.EVAL_MODE,
          syntaxError : null,
        }
      })

      reportEvent('Submit Expression', 'submit valid', content)
    } catch (exception) {
      setBoxState({
        ...state,
        editor : {
          ...state.editor,
          syntaxError : exception.toString(),
        }
      })

      reportEvent('Submit Expression', 'submit invalid', content)
    }
  }

  // THROWS Exceptions
  parseExpression (expression : string, macrotable : MacroMap) : AST {
    // const { macroTable } = this.props

    const { SLI : singleLetterVars } = this.props.state

    const tokens : Array<Token> = tokenize(expression, { lambdaLetters : ['λ'], singleLetterVars })
    const ast : AST = parse(tokens, macrotable) // macroTable

    return ast
  }

}

function toMacroMap (definitions : Array<string>) : MacroMap {
  return definitions.reduce((acc : MacroMap, def) => {
    const [name, body] = def.split(':=')
    return { ...acc, [name.trim()] : body.trim() }
  }, {})
}