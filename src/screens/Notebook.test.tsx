import { readFileSync } from 'fs';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import Notebook, { selectPrimeBox, zenStep } from './Notebook';
import { BoxType, NotebookState } from '../Types';
import { NoteState } from '../markdown-integration/AppTypes';
import { tokenize, parse, None } from '@lambdulus/core';
import { EvaluationStrategy, StepValidity, UntypedLambdaState, UntypedLambdaType } from '../untyped-lambda-integration/Types';

afterEach(() => cleanup());

test('prime box is the last one reaching past the prime line', () => {
  expect(selectPrimeBox([
    { top : -400, height : 300 },
    { top : -50, height : 300 },
    { top : 500, height : 300 },
  ], 100)).toBe(1);
});

test('prime box defaults to the first and ignores hidden boxes', () => {
  expect(selectPrimeBox([
    { top : 500, height : 300 },
    { top : 900, height : 300 },
  ], 100)).toBe(0);

  // A hidden box past the line never wins: without the height guard
  // this would prime box 2 instead of box 1.
  expect(selectPrimeBox([
    { top : -400, height : 300 },
    { top : -50, height : 300 },
    { top : -10, height : 0 },
  ], 100)).toBe(1);
});

test('zen paging steps within range and stops at the ends', () => {
  expect(zenStep(0, 3, 1)).toBe(1);
  expect(zenStep(1, 3, -1)).toBe(0);
  expect(zenStep(2, 3, 1)).toBeNull();
  expect(zenStep(0, 3, -1)).toBeNull();
  expect(zenStep(0, 1, 1)).toBeNull();
});

test('zen mode shows only the current box and no add buttons', () => {
  const css = readFileSync('src/App.css', 'utf8');
  expect(css).toMatch(/\.mainSpace\.zen \.boxList > \.LI\s*\{[^}]*display\s*:\s*none/);
  expect(css).toMatch(/\.mainSpace\.zen \.boxList > \.LI\.zen-current\s*\{[^}]*display\s*:\s*block/);
  expect(css).toMatch(/\.mainSpace\.zen \.add_box_after\s*\{[^}]*display\s*:\s*none/);
  expect(css).toMatch(/\.mainSpace\.zen \.notebook-title\s*\{[^}]*display\s*:\s*none/);
});

function noteBox (note : string, key : string) : NoteState {
  return {
    __key : key,
    type : BoxType.MARKDOWN,
    title : 'Note',
    minimized : false,
    settingsOpen : false,
    note,
    isEditing : false,
    editor : { placeholder : '', content : '', caretPosition : 0, syntaxError : null },
  };
}

function renderZenNotebook (onPatch : (patch : Partial<NotebookState>) => void, anchor : number = 0) {
  const state : NotebookState = {
    name : 'Test',
    zenMode : true,
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : anchor,
    focusedBoxIndex : anchor,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };

  return render(<Notebook state={ state } updateNotebook={ onPatch } />);
}

test('zen shows only the anchor box and arrows page between boxes', () => {
  const downPatches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { downPatches.push(patch); });

  expect(container.querySelectorAll('.boxList > .LI').length).toBe(2);
  expect(container.querySelectorAll('.boxList > .LI.zen-current').length).toBe(1);

  fireEvent.keyDown(document, { key : 'ArrowDown' });
  expect(downPatches.some((patch) => patch.activeBoxIndex === 1 && patch.focusedBoxIndex === 1)).toBe(true);
  unmount();

  const upPatches : Array<Partial<NotebookState>> = [];
  const second = renderZenNotebook((patch) => { upPatches.push(patch); }, 1);
  fireEvent.keyDown(document, { key : 'ArrowUp' });
  expect(upPatches.some((patch) => patch.activeBoxIndex === 0 && patch.focusedBoxIndex === 0)).toBe(true);
  second.unmount();
});

test('zen arrow keys stay put while typing in an editor', () => {
  const patches : Array<Partial<NotebookState>> = [];
  renderZenNotebook((patch) => { patches.push(patch); });

  const input : HTMLInputElement = document.createElement('input');
  document.body.appendChild(input);
  input.focus();
  try {
    fireEvent.keyDown(document, { key : 'ArrowDown' });
    expect(patches.length).toBe(0);
  }
  finally {
    input.remove();
  }
});

test('zen arrow keys never nudge the page, even past the last box', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const first = renderZenNotebook((patch) => { patches.push(patch); }, 0);
  expect(fireEvent.keyDown(document, { key : 'ArrowUp' })).toBe(false);
  expect(patches.length).toBe(0);
  first.unmount();

  const last = renderZenNotebook((patch) => { patches.push(patch); }, 1);
  expect(fireEvent.keyDown(document, { key : 'ArrowDown' })).toBe(false);
  expect(patches.length).toBe(0);
  last.unmount();
});

test('zen single box fits the viewport with no page scroll', () => {
  // Every vertical contributor outside the fitted box must be zeroed:
  // the list margins, the row margin, and the box padding folded into
  // the fixed height, or the page drifts a little under a zen box.
  const css = readFileSync('src/App.css', 'utf8');
  const list = css.match(/\.mainSpace\.zen \.boxList\s*\{[^}]*\}/)?.[0] ?? '';
  expect(list).toMatch(/margin-top\s*:\s*0/);
  expect(list).toMatch(/margin-bottom\s*:\s*0/);
  const row = css.match(/\.mainSpace\.zen \.boxList > \.LI\s*\{[^}]*\}/)?.[0] ?? '';
  expect(row).toMatch(/margin-bottom\s*:\s*0/);
  expect(css).toMatch(/\.mainSpace\.zen \.boxContainer\s*\{[^}]*height\s*:\s*calc\(100vh - 160px\)/);
});

test('zen box clamps to the viewport with history as the shrinker', () => {
  // Fixed-height flex column down to the scroller; the bare wrappers
  // go display:contents so the chain is unbroken, and every level
  // carries min-height:0 so content cannot pry the box open.
  const css = readFileSync('src/App.css', 'utf8');
  const container = css.match(/\.mainSpace\.zen \.boxContainer\s*\{[^}]*\}/)?.[0] ?? '';
  expect(container).toMatch(/display\s*:\s*flex/);
  expect(container).toMatch(/flex-direction\s*:\s*column/);
  expect(css).toMatch(/\.mainSpace\.zen \.untypedLambdaBoxContent\s*\{[^}]*display\s*:\s*contents/);
  const scroller = css.match(/\.mainSpace\.zen \.box-history-scroll\s*\{[^}]*\}/)?.[0] ?? '';
  expect(scroller).toMatch(/flex\s*:\s*1 1 auto/);
  expect(scroller).toMatch(/min-height\s*:\s*0/);
  expect(scroller).toMatch(/max-height\s*:\s*none/);
});

test('zen lambda box exposes the flex clamp hooks', () => {
  const macrotable = {};
  const ast = parse(tokenize('(λx.x) y', { lambdaLetters : ['λ'], singleLetterVars : true, macromap : macrotable }), macrotable);
  const message = { validity : StepValidity.CORRECT, userInput : '', message : '' };
  const lambda = {
    __key : 'lambda',
    type : BoxType.UNTYPED_LAMBDA,
    subtype : UntypedLambdaType.ORDINARY,
    title : 'Lambda',
    minimized : false,
    settingsOpen : false,
    macrolistOpen : false,
    history : [{ ast, lastReduction : new None(), step : 0, message, isNormalForm : false, exerciseStep : false }],
    breakpoints : [],
    editor : { placeholder : '', content : '', syntaxError : null },
    strategy : EvaluationStrategy.NORMAL,
    SDE : true,
    macrotable : {},
    collapseOldSteps : true,
    isRunning : false,
  } as unknown as UntypedLambdaState;

  const state : NotebookState = {
    name : 'Test',
    zenMode : true,
    boxList : [ lambda ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ () => void 0 } />);
  try {
    expect(container.querySelector('.untypedLambdaBox .untypedLambdaBoxContent .box-history-scroll')).not.toBeNull();
  }
  finally {
    unmount();
  }
});

test('zen box switches animate in', () => {
  const css = readFileSync('src/App.css', 'utf8');
  expect(css).toMatch(/\.LI\.zen-current\s*\{[^}]*animation\s*:/);
  expect(css).toMatch(/@keyframes\s+zen-arrive/);
});

test('zen arrow keys stay put outside zen mode', () => {
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const updateNotebook = vi.fn();
  render(<Notebook state={ state } updateNotebook={ updateNotebook } />);

  fireEvent.keyDown(document, { key : 'ArrowDown' });
  expect(updateNotebook).not.toHaveBeenCalled();
});

test('scrollable history sits back slightly, focused step comes forward', () => {
  const css = readFileSync('src/untyped-lambda-integration/styles/EvaluatorBox.css', 'utf8');
  const block = css.match(/\.box-history-scroll \.inactiveStep\s*\{[^}]*\}/)?.[0] ?? '';
  expect(block).toMatch(/opacity\s*:\s*0\.8/);
});
