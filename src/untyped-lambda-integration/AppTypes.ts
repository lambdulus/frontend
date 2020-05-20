import { MacroMap, AST, ASTReduction, NormalEvaluator, ApplicativeEvaluator, OptimizeEvaluator } from "@lambdulus/core"

import { BoxType, AbstractSettings, BoxState, Box } from '../AppTypes'

export const ADD_BOX_LABEL = '+λ'

export enum PromptPlaceholder {
  INIT = 'Type λ (as \\) expression and hit enter',
  EVAL_MODE = 'Hit enter for next step',
  VALIDATE_MODE = 'Write next step and hit enter for validation',
  MACRO = 'Define Macro like: `NAME := [λ expression]` and hit enter',
  NOTE = 'Type note and hit shift enter'
}

export type Breakpoint = {
  type : ASTReduction,
  context : AST,
  broken : Set<AST>,
}

export interface StepRecord {
  ast : AST
  lastReduction : ASTReduction | null
  step : number
  message : string
  isNormalForm : boolean
}

export enum EvaluationStrategy {
  NORMAL = 'Normal Evaluation',
  APPLICATIVE = 'Applicative Evaluation',
  OPTIMISATION = 'Optimisation - η Conversion',
  ABSTRACTION = 'Abstraction / Simplified Evaluation'
}

export interface UntypedLambdaState extends Box {
  __key : string
  type : BoxType
  expression : string
  ast : AST | null
  history : Array<StepRecord>
  isRunning : boolean
  breakpoints : Array<Breakpoint>
  timeoutID : number | undefined
  timeout : number
  isExercise : boolean
  
  strategy : EvaluationStrategy
  singleLetterNames : boolean
  standalones : boolean
  
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
}

export const CODE_NAME = 'UNTYPED_LAMBDA_CALCULUS'

export interface UntypedLambdaSettings extends AbstractSettings {
  SLI : boolean
  expandStandalones : boolean
  strategy : EvaluationStrategy
}

export type Evaluator = NormalEvaluator | ApplicativeEvaluator | OptimizeEvaluator


export function createNewUntypedLambda () : UntypedLambdaState {
  return {
    __key : Date.now().toString(),
    type : BoxType.UNTYPED_LAMBDA,
    expression : "",
    ast : null,
    history : [],
    isRunning : false,
    breakpoints : [],
    timeoutID : undefined,
    timeout : 5,
    isExercise : false,
    
    strategy : EvaluationStrategy.NORMAL,
    singleLetterNames : false,
    standalones : false,
    
    editor : {
      placeholder : "placeholder",
      content : "",
      caretPosition : 0,
      syntaxError : null,
    }
  }
}