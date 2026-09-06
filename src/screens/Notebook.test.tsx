import { readFileSync } from 'fs';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import Notebook, { selectPrimeBox, zenStep, zenBoxLabel } from './Notebook';
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

test('bottom spacer permanently holds seating room', () => {
  // Small trailing boxes must seat at the top from first paint, not
  // only after a focus grows the spacer: a full view minus the 60px
  // seating offset always leaves enough scroll potential.
  const css = readFileSync('src/App.css', 'utf8');
  const spacer = css.match(/^\.notebook-bottom-spacer\s*\{[^}]*\}/m)?.[0] ?? '';
  expect(spacer).toMatch(/height\s*:\s*calc\(100vh - 60px\)/);
});

test('prime follows the box owning the view center', () => {
  // Barely scrolled up: the lower box still fills most of the view,
  // so it keeps the focus even though its top left the top bar area.
  expect(selectPrimeBox([
    { top : -600, height : 500 },
    { top : 150, height : 900 },
  ], 400)).toBe(1);
});

test('a box below the center does not steal focus', () => {
  // Scrolling down: the next box owns only the bottom of the view
  // until its top bar crosses the center, so focus stays above.
  expect(selectPrimeBox([
    { top : -100, height : 400 },
    { top : 450, height : 900 },
  ], 400)).toBe(0);
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
  // Fixed-height flex column down to the scroller, plain nested flex
  // on the real wrappers; every level carries min-height:0 so content
  // cannot pry the box open.
  const css = readFileSync('src/App.css', 'utf8');
  const container = css.match(/\.mainSpace\.zen \.boxContainer\s*\{[^}]*\}/)?.[0] ?? '';
  expect(container).toMatch(/display\s*:\s*flex/);
  expect(container).toMatch(/flex-direction\s*:\s*column/);
  const content = css.match(/\.mainSpace\.zen \.untypedLambdaBoxContent\s*\{[^}]*\}/)?.[0] ?? '';
  expect(content).toMatch(/display\s*:\s*flex/);
  expect(content).toMatch(/flex-direction\s*:\s*column/);
  expect(content).toMatch(/min-height\s*:\s*0/);
  const scroller = css.match(/\.mainSpace\.zen \.box-history-scroll\s*\{[^}]*\}/)?.[0] ?? '';
  expect(scroller).toMatch(/flex\s*:\s*1 1 auto/);
  expect(scroller).toMatch(/min-height\s*:\s*0/);
  expect(scroller).toMatch(/max-height\s*:\s*none/);
  // The wrap hugs short content (no dead gap above the current step)
  // and only yields when squeezed.
  const wrap = css.match(/\.mainSpace\.zen \.box-history-wrap\s*\{[^}]*\}/)?.[0] ?? '';
  expect(wrap).toMatch(/flex\s*:\s*0 1 auto/);
  expect(wrap).toMatch(/min-height\s*:\s*0/);
  // The page itself is locked; only the history pane moves.
  expect(css).toMatch(/body\.zen\s*\{[^}]*overflow\s*:\s*hidden/);
});

test('box settings panel floats above the box', () => {
  // Overlay, not in-flow: opening settings must never squeeze the
  // history, and it docks right under the title bar.
  const css = readFileSync('src/untyped-lambda-integration/styles/Settings.css', 'utf8');
  const panel = css.match(/\.box-settings\s*\{[^}]*\}/)?.[0] ?? '';
  expect(panel).toMatch(/position\s*:\s*absolute/);
  expect(panel).toMatch(/right\s*:/);
  expect(panel).toMatch(/z-index\s*:/);
});

test('box top bar stays plain chrome', () => {
  // Reverted accent experiments: the bar is transparent layout only,
  // boxes announce themselves through content, not header dressing.
  const css = readFileSync('src/styles/BoxTopBar.css', 'utf8');
  const bar = css.match(/\.boxTopBar\s*\{[^}]*\}/)?.[0] ?? '';
  expect(bar).not.toMatch(/background-color/);
  expect(bar).not.toMatch(/border/);
});

test('zen locks the page scroll on the body while mounted', () => {
  const { unmount } = renderZenNotebook(() => void 0);
  expect(document.body.classList.contains('zen')).toBe(true);
  unmount();
  expect(document.body.classList.contains('zen')).toBe(false);
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

test('zen map labels boxes by their initial term', () => {
  const lambda = {
    type : BoxType.UNTYPED_LAMBDA,
    title : '',
    history : [{ ast : { toString : () => '(λx.x) y' } }],
  } as unknown as UntypedLambdaState;
  expect(zenBoxLabel(lambda)).toBe('(λx.x) y');

  const fresh = {
    type : BoxType.UNTYPED_LAMBDA,
    title : 'Fresh',
    history : [],
  } as unknown as UntypedLambdaState;
  expect(zenBoxLabel(fresh)).toBe('Fresh');

  expect(zenBoxLabel(noteBox('hello', 'x'))).toBe('Note');
});

test('zen map lists every box, marks the anchor, jumps on click', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const items = container.querySelectorAll('.zen-map-item');
    expect(items.length).toBe(2);
    expect(container.querySelectorAll('.zen-map-item--current').length).toBe(1);
    expect(items[0].classList.contains('zen-map-item--current')).toBe(true);

    fireEvent.click(items[1]);
    expect(patches.some((patch) => patch.activeBoxIndex === 1 && patch.focusedBoxIndex === 1)).toBe(true);
  }
  finally {
    unmount();
  }
});

test('zen map is a capped, fading, scrollable rail', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const list = css.match(/\.zen-map-list\s*\{[^}]*\}/)?.[0] ?? '';
  expect(list).toMatch(/max-height\s*:\s*70vh/);
  expect(list).toMatch(/overflow-y\s*:\s*auto/);
  expect(css).toMatch(/\.zen-map-list\.mask-top\.mask-bottom\s*\{[^}]*mask-image/);
  const current = css.match(/\.zen-map-item--current\s*\{[^}]*\}/)?.[0] ?? '';
  expect(current).toMatch(/border-left-color\s*:\s*var\(--accent\)/);
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

test('every box has a grab rail; clicking it focuses the box', () => {
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
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ updateNotebook } />);
  try {
    const rails = container.querySelectorAll('.box-rail');
    expect(rails.length).toBe(2);
    expect(rails[0].classList.contains('box-rail--focused')).toBe(true);
    expect(rails[1].classList.contains('box-rail--focused')).toBe(false);

    fireEvent.click(rails[1]);
    expect(updateNotebook).toHaveBeenCalledWith(expect.objectContaining({ activeBoxIndex : 1, focusedBoxIndex : 1 }));
  }
  finally {
    unmount();
  }
});

test('scrollable history sits back slightly, focused step comes forward', () => {
  const css = readFileSync('src/untyped-lambda-integration/styles/EvaluatorBox.css', 'utf8');
  const block = css.match(/\.box-history-scroll \.inactiveStep\s*\{[^}]*\}/)?.[0] ?? '';
  expect(block).toMatch(/opacity\s*:\s*0\.8/);
});
