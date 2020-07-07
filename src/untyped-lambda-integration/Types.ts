import { AbstractSettings, BoxType, AbstractBoxState, AbstractIntegrationState } from "../Types"
import { AST, ASTReduction, ASTReductionType, NormalEvaluator, ApplicativeEvaluator, OptimizeEvaluator, MacroMap } from "@lambdulus/core"


export interface UntypedLambdaIntegrationState extends AbstractIntegrationState {
  macrotable : MacroMap
}

export enum PromptPlaceholder {
  INIT = 'Type λ (as \\) expression and hit enter',
  EVAL_MODE = 'Hit enter for next step',
  VALIDATE_MODE = 'Write next step and hit enter for validation',
  MACRO = 'Define Macro like: `NAME := [λ expression]` and hit enter',
  NOTE = 'Type note and hit shift enter'
}

export enum UntypedLambdaType {
  ORDINARY,
  EXERCISE,
  MACRO,
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
  message : string
  isNormalForm : boolean
}

export enum EvaluationStrategy {
  NORMAL = 'Normal Evaluation',
  APPLICATIVE = 'Applicative Evaluation',
  OPTIMISATION = 'Optimisation - η Conversion',
  ABSTRACTION = 'Abstraction / Simplified Evaluation'
}

export type UntypedLambdaState = UntypedLambdaExpressionState | UntypedLambdaMacroState

// TODO: consider abstract Untype Lambda State which will hold all common members

export interface UntypedLambdaExpressionState extends AbstractBoxState {
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
  // isExercise : boolean
  
  strategy : EvaluationStrategy
  SLI : boolean
  expandStandalones : boolean

  macrolistOpen : boolean
  macrotable : MacroMap
  
  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
}

export interface UntypedLambdaMacroState extends AbstractBoxState {
  __key : string
  type : BoxType

  subtype : UntypedLambdaType
  expression : string
  ast : AST | null
  macroName : string
  macroExpression : string
  
  SLI : boolean
  expandStandalones : boolean
  strategy : EvaluationStrategy

  macrolistOpen : boolean
  macrotable : MacroMap

  editor : {
    placeholder : string
    content : string
    caretPosition : number
    syntaxError : Error | null
  }
}

export interface UntypedLambdaSettings extends AbstractSettings {
  SLI : boolean
  expandStandalones : boolean
  strategy : EvaluationStrategy
}

export type Evaluator = NormalEvaluator | ApplicativeEvaluator | OptimizeEvaluator
