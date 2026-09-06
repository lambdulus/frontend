import { readFileSync } from 'fs';
import { useState } from 'react';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import Notebook, { selectPrimeBox, zenStep, mapBoxLabel } from './Notebook';
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
  // until its top bar closes in on the center, so focus stays above.
  expect(selectPrimeBox([
    { top : -100, height : 400 },
    { top : 450, height : 900 },
  ], 400)).toBe(0);
});

test('zen hides the grab rail', () => {
  // One box, always focused: nothing to separate or grab, and the
  // stretched rail would overshoot short histories into the clamp.
  const css = readFileSync('src/App.css', 'utf8');
  expect(css).toMatch(/\.mainSpace\.zen \.box-rail\s*\{[^}]*display\s*:\s*none/);
});

test('zen hides the collapse toggle', () => {
  // Collapsing the single zen box serves nothing, so the toggle
  // steps out with the other box furniture.
  const css = readFileSync('src/App.css', 'utf8');
  expect(css).toMatch(/\.mainSpace\.zen \.box-top-bar--collapse-toggle\s*\{[^}]*display\s*:\s*none/);
});

test('prime leads slightly below the center', () => {
  // The handover anticipates: at 65% of an 800px view the next box
  // takes focus while its top is still below the true center.
  expect(selectPrimeBox([
    { top : -100, height : 400 },
    { top : 450, height : 900 },
  ], 520)).toBe(1);
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

test('box map labels boxes by their initial term', () => {
  const lambda = {
    type : BoxType.UNTYPED_LAMBDA,
    title : '',
    history : [{ ast : { toString : () => '(λx.x) y' } }],
  } as unknown as UntypedLambdaState;
  expect(mapBoxLabel(lambda)).toBe('(λx.x) y');

  const fresh = {
    type : BoxType.UNTYPED_LAMBDA,
    title : 'Fresh',
    history : [],
  } as unknown as UntypedLambdaState;
  expect(mapBoxLabel(fresh)).toBe('Fresh');

  expect(mapBoxLabel(noteBox('hello', 'x'))).toBe('Note');
});

test('box map lists every box, marks the anchor, jumps on click', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const items = container.querySelectorAll('.box-map-item');
    expect(items.length).toBe(2);
    expect(container.querySelectorAll('.box-map-item--current').length).toBe(1);
    expect(items[0].classList.contains('box-map-item--current')).toBe(true);

    fireEvent.click(items[1]);
    expect(patches.some((patch) => patch.activeBoxIndex === 1 && patch.focusedBoxIndex === 1)).toBe(true);
  }
  finally {
    unmount();
  }
});

test('box map flanks the anchor with paging arrows', () => {
  // Anchored first: no way up, one way down; clicking it pages.
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const arrows = container.querySelectorAll('.box-map-arrow');
    expect(arrows.length).toBe(1);
    expect(arrows[0].getAttribute('aria-label')).toBe('Next box');

    fireEvent.click(arrows[0]);
    expect(patches.some((patch) => patch.activeBoxIndex === 1 && patch.focusedBoxIndex === 1)).toBe(true);
  }
  finally {
    unmount();
  }

  // Anchored last: the lone arrow points up.
  const second = renderZenNotebook(() => void 0, 1);
  try {
    const arrows = second.container.querySelectorAll('.box-map-arrow');
    expect(arrows.length).toBe(1);
    expect(arrows[0].getAttribute('aria-label')).toBe('Previous box');
  }
  finally {
    second.unmount();
  }
});

test('box map is a capped, fading, scrollable rail', () => {
  const css = readFileSync('src/App.css', 'utf8');
  const list = css.match(/\.box-map-list\s*\{[^}]*\}/)?.[0] ?? '';
  expect(list).toMatch(/max-height\s*:\s*70vh/);
  expect(list).toMatch(/overflow-y\s*:\s*auto/);
  expect(css).toMatch(/\.box-map-list\.mask-top\.mask-bottom\s*\{[^}]*mask-image/);
  const current = css.match(/\.box-map-item--current\s*\{[^}]*\}/)?.[0] ?? '';
  expect(current).toMatch(/border-left-color\s*:\s*var\(--accent\)/);
  // The list lets clicks fall through to the box below; only the
  // lines and arrows catch them.
  expect(list).toMatch(/pointer-events\s*:\s*none/);
  const arrow = css.match(/\.box-map-arrow\s*\{[^}]*\}/)?.[0] ?? '';
  expect(arrow).toMatch(/pointer-events\s*:\s*auto/);
  // The paging arrows center on the map lines.
  expect(arrow).toMatch(/text-align\s*:\s*center/);
});

test('narrow screens slim the column and halve the map', () => {
  // Below the width where the full column and map still clear each
  // other, both shrink so the map never overlaps the box; the macro
  // popup's dock offset follows the slimmer column.
  const css = readFileSync('src/App.css', 'utf8');
  const media = css.match(/@media[^{]*max-width\s*:\s*1831px[\s\S]*$/)?.[0] ?? '';
  expect(media).toMatch(/\.mainSpace\s*\{[^}]*max-width\s*:\s*810px/);
  expect(media).toMatch(/\.box-map\s*\{[^}]*width\s*:\s*185px/);
  expect(media).toMatch(/\.macro-dock\s*\{[^}]*\(100vw - 850px\)/);
});

test('box map shows in normal mode too', () => {
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ () => void 0 } />);
  try {
    expect(container.querySelectorAll('.box-map-item').length).toBe(2);
    expect(container.querySelectorAll('.box-map-item--current').length).toBe(1);
  }
  finally {
    unmount();
  }
});

test('zen offers a floating add-box after the anchor', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    // Floating New-box button...
    const plus = container.querySelector('.zen-add .create-box-plus') as HTMLElement;
    expect(plus.textContent).toMatch(/New box/);

    // ...opening the type picker in place...
    fireEvent.click(plus);
    const groups = container.querySelectorAll('.zen-add .add-box--group');
    expect(groups.length).toBe(2);

    // ...appending after the anchor and focusing the new box at once
    // (the notebook holds two boxes, so the insert makes three).
    fireEvent.click(groups[0]);
    expect(patches.some((patch) => patch.boxList?.length === 3 && patch.activeBoxIndex === 1 && patch.focusedBoxIndex === 1)).toBe(true);
  }
  finally {
    unmount();
  }
});

test('no floating add-box outside zen mode', () => {
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ () => void 0 } />);
  try {
    expect(container.querySelector('.zen-add')).toBeNull();
  }
  finally {
    unmount();
  }
});

test('floating box arrows stay hidden', () => {
  // Retired in favor of the map paging arrows; the markup stays for
  // an easy revert.
  const css = readFileSync('src/App.css', 'utf8');
  const nav = css.match(/\.box-nav\s*\{[^}]*\}/)?.[0] ?? '';
  expect(nav).toMatch(/display\s*:\s*none/);
  expect(css).not.toMatch(/min-width\s*:\s*1150px/);
});

test('zen box switches animate in', () => {
  // The arrival slides the inner frame, never the row: the row top
  // is what seating measures, and animating it would plant every
  // switch a few pixels off its seat.
  const css = readFileSync('src/App.css', 'utf8');
  const row = css.match(/\.LI\.zen-current\s*\{[^}]*\}/)?.[0] ?? '';
  expect(row).not.toMatch(/animation/);
  expect(css).toMatch(/\.LI\.zen-current \.box-frame\s*\{[^}]*animation\s*:/);
  expect(css).toMatch(/@keyframes\s+zen-arrive/);
});

test('arrow keys page between boxes in normal mode too', () => {
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
  expect(updateNotebook).toHaveBeenCalledWith(expect.objectContaining({ activeBoxIndex : 1, focusedBoxIndex : 1 }));
});

test('entering zen seats the anchor on entry', () => {
  // Entering zen collapses the other boxes out of the layout, which
  // can land the anchor a few pixels off its seat: plant it exactly
  // on entry so later clicks have nothing to nudge.
  const base : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const originalScrollTo = window.scrollTo;
  const spy = vi.fn();
  window.scrollTo = spy;
  const { rerender, unmount } = render(<Notebook state={ base } updateNotebook={ () => void 0 } />);
  try {
    spy.mockClear();
    rerender(<Notebook state={ { ...base, zenMode : true } } updateNotebook={ () => void 0 } />);
    // jsdom measures every box top at 0, so the 76px zen seat reads
    // as a -76 scroll: what matters is that entry seats at all.
    expect(spy).toHaveBeenCalledWith({ top : -76, behavior : 'smooth' });
  }
  finally {
    unmount();
    window.scrollTo = originalScrollTo;
  }
});

test('leaving zen seats the anchor and keeps its focus', () => {
  // Leaving brings the title and siblings back, which can land the
  // anchor a few pixels off its seat: plant it exactly on exit. The
  // box pinning steps aside across the flip, so no pin scroll fires
  // the prime sync mid-flip (jsdom measures every top at 0, which
  // would otherwise re-prime onto the last box).
  const base : NotebookState = {
    name : 'Test',
    zenMode : true,
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const patches : Array<Partial<NotebookState>> = [];
  const onPatch = (patch : Partial<NotebookState>) : void => { patches.push(patch); };
  const originalScrollTo = window.scrollTo;
  const spy = vi.fn();
  window.scrollTo = spy;
  const { rerender, unmount } = render(<Notebook state={ base } updateNotebook={ onPatch } />);
  try {
    spy.mockClear();
    rerender(<Notebook state={ { ...base, zenMode : false } } updateNotebook={ onPatch } />);
    // jsdom measures every box top at 0, so the 60px seat reads as
    // a -60 scroll: what matters is that exit seats at all.
    expect(spy).toHaveBeenCalledWith({ top : -60, behavior : 'smooth' });
    // And nothing re-derives the focus: the anchor keeps it.
    expect(patches.some((patch) => patch.focusedBoxIndex !== undefined)).toBe(false);
  }
  finally {
    unmount();
    window.scrollTo = originalScrollTo;
  }
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
    const frames = container.querySelectorAll('.box-frame');
    expect(frames.length).toBe(2);
    expect(frames[0].classList.contains('box-frame--focused')).toBe(true);
    expect(frames[1].classList.contains('box-frame--focused')).toBe(false);

    fireEvent.click(rails[1]);
    expect(updateNotebook).toHaveBeenCalledWith(expect.objectContaining({ activeBoxIndex : 1, focusedBoxIndex : 1 }));
  }
  finally {
    unmount();
  }
});

test('boxes show up as cards', () => {
  // The box itself is the card: theme surface, a full border, a
  // radius, a quiet shadow; the active box lifts with a deeper one.
  // No frame pseudo-element draws anything anymore.
  const app = readFileSync('src/App.css', 'utf8');
  const card = app.match(/\.boxContainer\s*\{[^}]*\}/)?.[0] ?? '';
  expect(card).toMatch(/background\s*:\s*var\(--surface\)/);
  expect(card).toMatch(/border\s*:\s*1px solid var\(--border\)/);
  expect(card).toMatch(/border-radius\s*:\s*12px/);
  expect(card).toMatch(/box-shadow\s*:\s*var\(--shadow\)/);
  expect(app).toMatch(/\.boxContainer\.active\s*\{[^}]*box-shadow\s*:\s*var\(--shadow-lift\)/);
  const frame = readFileSync('src/styles/BoxContainer.css', 'utf8');
  expect(frame).not.toMatch(/::after/);
});

// A live store for flows that span several updates (focus moves,
// then scrolls): the mock-update tests above cannot see those.
function NotebookHarness ({ initial } : { initial : NotebookState }) {
  const [state, setState] = useState(initial);
  return <Notebook state={ state } updateNotebook={ (patch) => setState((s) => ({ ...s, ...patch })) } />;
}

function threeNotes () : NotebookState {
  return {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b'), noteBox('third', 'c') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
}

test('scroll-prime holds still while a keyed seat is landing', async () => {
  // Without the guard the accent would jump to the new box, fall
  // back mid-glide as prime reads the old scroll position, then jump
  // again on arrival. (jsdom measures every box top at 0, so an
  // unguarded prime would always point at the last box.)
  const originalScrollTo = window.scrollTo;
  window.scrollTo = vi.fn();
  const { container, unmount } = render(<NotebookHarness initial={ threeNotes() } />);
  try {
    fireEvent.click(container.querySelectorAll('.box-rail')[1]);
    expect(container.querySelectorAll('.box-map-item--current').length).toBe(1);

    fireEvent.scroll(window);
    await new Promise((resolve) => setTimeout(resolve, 80));

    const items = container.querySelectorAll('.box-map-item');
    expect(items[1].classList.contains('box-map-item--current')).toBe(true);
  }
  finally {
    unmount();
    window.scrollTo = originalScrollTo;
  }
});

test('adding a box seats it into view', () => {
  const originalScrollTo = window.scrollTo;
  const spy = vi.fn();
  window.scrollTo = spy;
  const { container, unmount } = render(<NotebookHarness initial={ {
    name : 'Test',
    boxList : [ noteBox('first', 'a') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  } } />);
  try {
    fireEvent.mouseDown(container.querySelector('.add_box_after') as HTMLElement);
    const groups = container.querySelectorAll('.add-box--group');
    expect(groups.length).toBe(2);

    fireEvent.click(groups[0]);
    const items = container.querySelectorAll('.box-map-item');
    expect(items.length).toBe(2);
    expect(items[1].classList.contains('box-map-item--current')).toBe(true);
    // jsdom measures every box top at 0, so the 60px normal seat
    // reads as a -60 scroll: what matters is that adding seats at all.
    expect(spy).toHaveBeenCalledWith({ top : -60, behavior : 'smooth' });
  }
  finally {
    unmount();
    window.scrollTo = originalScrollTo;
  }
});

test('scrollable history sits back slightly, focused step comes forward', () => {
  const css = readFileSync('src/untyped-lambda-integration/styles/EvaluatorBox.css', 'utf8');
  const block = css.match(/\.box-history-scroll \.inactiveStep\s*\{[^}]*\}/)?.[0] ?? '';
  expect(block).toMatch(/opacity\s*:\s*0\.8/);
});
