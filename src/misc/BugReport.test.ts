import { test, expect } from 'vitest';

import { BoxType, NotebookState } from '../Types';
import { Theme } from '../contexts/Theme';
import { EvaluationStrategy, UntypedLambdaState, UntypedLambdaType } from '../untyped-lambda-integration/Types';
import { buildBugReportURL, BugReportInput } from './BugReport';

function box (expression : string) : UntypedLambdaState {
  return {
    __key : 'box-1',
    type : BoxType.UNTYPED_LAMBDA,
    title : 'Box 1',
    minimized : false,
    settingsOpen : false,
    subtype : UntypedLambdaType.ORDINARY,
    expression,
    ast : null,
    history : [],
    isRunning : false,
    breakpoints : [],
    timeoutID : undefined,
    timeout : 5000,
    strategy : EvaluationStrategy.NORMAL,
    SDE : false,
    ETA : false,
    SLI : false,
    expandStandalones : false,
    collapseOldSteps : true,
    macrolistOpen : false,
    macrotable : {},
    editor : { placeholder : '', content : expression, syntaxError : null },
  };
}

function input (expression : string) : BugReportInput {
  const notebook : NotebookState = {
    name : 'Notebook 1',
    zenMode : false,
    boxList : [box(expression)],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'notebook-1',
  };
  return {
    notebooks : [notebook],
    activeNotebookIndex : 0,
    theme : Theme.Dark,
    accent : 'blue',
    boxStyle : 'cards',
    settings : {},
  };
}

function bodyOf (url : string) : string {
  const params : URLSearchParams = new URLSearchParams(new URL(url).search);
  const body : string | null = params.get('body');
  expect(body).not.toBeNull();
  return body as string;
}

test('bug report links to a new pre-filled issue', () => {
  const url : string = buildBugReportURL(input('(\\x.x)'));
  expect(url.startsWith('https://github.com/lambdulus/frontend/issues/new?')).toBe(true);

  const params : URLSearchParams = new URLSearchParams(new URL(url).search);
  expect(params.get('labels')).toBe('bug');
  expect(params.get('title')).toBe('[bug]: ');

  const body : string = bodyOf(url);
  expect(body).toContain('## What happened');
  expect(body).toContain('## Diagnostics');
  expect(body).toContain('Normal Evaluation');
  expect(body).toContain('(\\x.x)');
});

test('diagnostics carry the environment facts', () => {
  const body : string = bodyOf(buildBugReportURL(input('x')));
  expect(body).toMatch(/Viewport: \d+x\d+/);
  expect(body).toContain('Commit: ');
  expect(body).toContain('Dark');
  expect(body).toContain('Notebook 1');
});

test('long expressions are truncated, special chars survive', () => {
  const expression : string = '(λx.x & y # z)\n'.repeat(40);
  const body : string = bodyOf(buildBugReportURL(input(expression)));
  // The round-tripped body holds the 300-char preview, not the whole expression.
  expect(body).toContain(expression.slice(0, 300));
  expect(body).not.toContain(expression);
  expect(body).toContain('first 300');
});

test('empty notebook does not break the link', () => {
  const shaped : BugReportInput = input('x');
  shaped.notebooks = [];
  const body : string = bodyOf(buildBugReportURL(shaped));
  expect(body).toContain('none open');
});
