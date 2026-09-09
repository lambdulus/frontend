import { Accent, BoxState, BoxStyle, BoxType, GlobalSettings, NotebookState } from '../Types'
import { Theme } from '../contexts/Theme'
import { UntypedLambdaState } from '../untyped-lambda-integration/Types'

// The "Report a bug" icon deep-links to a new issue with the boring
// parts already filled in: build stamps, browser facts, and a snapshot
// of the workspace that is tedious to dictate and easy to get wrong.
// Everything sits in one editable Diagnostics section, so reporting
// stays one click while nothing is sent silently.
export interface BugReportInput {
  notebooks : Array<NotebookState>
  activeNotebookIndex : number
  theme : Theme
  accent : Accent
  boxStyle : BoxStyle
  settings : GlobalSettings
}

const ISSUES_URL = 'https://github.com/lambdulus/frontend/issues/new'
const EXPRESSION_PREVIEW_LENGTH = 300

function env (name : string) : string {
  const value : unknown = (import.meta.env as Record<string, unknown>)[name]
  return typeof value === 'string' && value.length > 0 ? value : 'unknown'
}

function environmentLines () : Array<string> {
  const lines : Array<string> = []
  lines.push(`- App version: ${ env('VITE_VERSION_INFO') }`)
  lines.push(`- Commit: ${ env('VITE_COMMIT') }`)
  lines.push(`- Reported at: ${ new Date().toISOString() }`)

  if (typeof window !== 'undefined') {
    lines.push(`- Page: ${ window.location.href }`)
    lines.push(`- Viewport: ${ window.innerWidth}x${ window.innerHeight } @ ${ window.devicePixelRatio }x`)
    if (typeof window.screen !== 'undefined') {
      lines.push(`- Screen: ${ window.screen.width }x${ window.screen.height }`)
    }
  }

  if (typeof navigator !== 'undefined') {
    lines.push(`- Browser: ${ navigator.userAgent }`)
    lines.push(`- Language: ${ navigator.language }`)
  }

  return lines
}

function workspaceLines (input : BugReportInput) : Array<string> {
  const notebook : NotebookState | undefined = input.notebooks[input.activeNotebookIndex]

  if (notebook === undefined) {
    return ['- Notebook: none open']
  }

  const lines : Array<string> = [
    `- Notebook: "${ notebook.name }" (${ input.notebooks.length } notebooks, ${ notebook.boxList.length } boxes, zen: ${ notebook.zenMode ?? false })`,
    `- Look: ${ Theme[input.theme] }, accent ${ input.accent }, ${ input.boxStyle } boxes`,
  ]
  return lines.concat(boxLines(notebook.boxList[notebook.activeBoxIndex]))
}

function boxLines (box : BoxState | undefined) : Array<string> {
  if (box === undefined) {
    return ['- Active box: none']
  }

  const lines : Array<string> = [
    `- Active box: "${ box.title }" (${ box.type }, minimized: ${ box.minimized })`,
  ]

  if (box.type === BoxType.UNTYPED_LAMBDA) {
    const state : UntypedLambdaState = box as UntypedLambdaState
    lines.push(`- Strategy: ${ state.strategy }, SDE: ${ state.SDE }, ETA: ${ state.ETA }, SLI: ${ state.SLI }`)
    lines.push(`- History: ${ state.history.length } steps, running: ${ state.isRunning }`)
    lines.push(`- Macros: ${ Object.keys(state.macrotable ?? {}).length } defined, dock open: ${ state.macrolistOpen }`)
    lines.push(`- Breakpoints: ${ state.breakpoints.length }`)

    if (state.editor?.syntaxError) {
      lines.push(`- Syntax error: ${ String(state.editor.syntaxError).slice(0, 200) }`)
    }

    const expression : string = state.expression ?? ''
    const preview : string = expression.slice(0, EXPRESSION_PREVIEW_LENGTH).replace(/`/g, "'")
    const scope : string = expression.length > EXPRESSION_PREVIEW_LENGTH ? `, first ${ EXPRESSION_PREVIEW_LENGTH }` : ''
    lines.push(`- Expression (${ expression.length } chars${ scope }):`)
    lines.push('```')
    lines.push(preview || '(empty)')
    lines.push('```')
  }

  return lines
}

export function buildBugReportURL (input : BugReportInput) : string {
  const body : Array<string> = [
    '## What happened',
    '<!-- describe the bug -->',
    '',
    '## What I expected',
    '<!-- what should have happened instead -->',
    '',
    '## Steps to reproduce',
    '<!-- 1. ... 2. ... -->',
    '',
    '## Diagnostics',
    '<!-- collected automatically when you clicked Report a bug; delete anything you would rather not share -->',
    ...environmentLines(),
    ...workspaceLines(input),
  ]

  const params : URLSearchParams = new URLSearchParams({
    title : '[bug]: ',
    labels : 'bug',
    body : body.join('\n'),
  })
  return `${ ISSUES_URL }?${ params.toString() }`
}
