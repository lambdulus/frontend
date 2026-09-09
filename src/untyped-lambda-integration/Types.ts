import { AbstractSettings, BoxType, AbstractBoxState } from "../Types"
import { AST, ASTReduction, ASTReductionType, MacroMap } from "@lambdulus/core"
export type { Evaluator } from "@lambdulus/core"


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

// The evaluation settings a session was submitted with. A submitted box
// whose current strategy/SLI/SDE differ was stepped under different
// rules, so the panel offers a restart. ETA is recorded but never
// dirties: it has its own at-normal-form behavior.
export interface SubmittedSettings {
  strategy : EvaluationStrategy
  SLI : boolean
  SDE : boolean
  ETA : boolean
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
  ETA : boolean // Eta conversion as the final evaluation step (opt-in, off by default)
  SLI : boolean
  expandStandalones : boolean
  collapseOldSteps : boolean
  submittedWith? : SubmittedSettings

  macrolistOpen : boolean
  // The dock the user asked for: set by the dock head and the tour, never
  // by focus syncs. Focus opens the dock only when this remembers an open,
  // so a fresh box stays a pill until opened, a hand-closed dock stays
  // shut across refocus, and old notebooks (field absent) stay shut too.
  macrolistWanted? : boolean
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
  ETA : boolean
  collapseOldSteps : boolean
}

export type SettingsEnabled = {
  SLI : boolean
  expandStandalones : boolean
  strategy : boolean
}


