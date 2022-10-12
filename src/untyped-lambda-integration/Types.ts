import { AbstractSettings, BoxType, AbstractBoxState } from "../Types"
import { AST, ASTReduction, ASTReductionType, NormalEvaluator, ApplicativeEvaluator, OptimizeEvaluator, MacroMap } from "@lambdulus/core"


export enum PromptPlaceholder {
  INIT = 'Type λ (as \\) expression and hit enter',
  EVAL_MODE = 'Hit enter for next step',
  VALIDATE_MODE = 'Write next step and hit enter for validation',
  MACRO = 'Define Macro like: `NAME := [λ expression]` and hit enter',
  NOTE = 'Type note and hit shift enter'
}

export enum UntypedLambdaType {
  EMPTY = 'EMPTY',
  ORDINARY = 'ORDINARY',
  EXERCISE = 'EXERCISE',
}

export type Breakpoint = {
  type : ASTReductionType,
  context : AST,
  broken : Set<AST>,
}

export interface StepRecord {
  ast : AST
  lastReduction : ASTReduction | null
  step : number
  message : StepMessage
  isNormalForm : boolean
  exerciseStep : boolean
}

export interface StepMessage {
  message : String
  validity : StepValidity
  userInput : String
}

export enum StepValidity {
  CORRECT,
  INCORRECT
}


export enum EvaluationStrategy {
  NORMAL = 'Normal Evaluation',
  APPLICATIVE = 'Applicative Evaluation',
  OPTIMISATION = 'Optimisation - η Conversion',
  ABSTRACTION = 'Abstraction / Simplified Evaluation'
}

export interface UntypedLambdaState extends AbstractBoxState {
  __key : string
  type : BoxType

  subtype : UntypedLambdaType
  expression : string
  ast : AST | null
  history : Array<StepRecord>
  isRunning : boolean
  breakpoints : Array<Breakpoint>
  timeoutID : number | undefined
  timeout : number
  
  strategy : EvaluationStrategy
  SDE : boolean // Semantics Drive Evaluation (Strategy) -- formerly called Simplified Strategy
  SLI : boolean
  expandStandalones : boolean

  macrolistOpen : boolean
  macrotable : MacroMap
  
  editor : {
    placeholder : string
    content : string
    syntaxError : Error | null
  }
}

export interface UntypedLambdaSettings extends AbstractSettings {
  SLI : boolean
  expandStandalones : boolean
  strategy : EvaluationStrategy
  SDE : boolean
}

export type SettingsEnabled = {
  SLI : boolean
  expandStandalones : boolean
  strategy : boolean
}

export type Evaluator = NormalEvaluator | ApplicativeEvaluator | OptimizeEvaluator
