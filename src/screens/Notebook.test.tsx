import { readFileSync } from 'fs';
import { useState } from 'react';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import Notebook, { syncDocksToFocus, selectPrimeBox, zenStep, mapBoxLabel } from './Notebook';
import { createNewUntypedLambdaExpression, defaultSettings } from '../untyped-lambda-integration/Constants';
import { BoxType, BoxState, NotebookState } from '../Types';
import { NoteState } from '../markdown-integration/AppTypes';
import { tokenize, parse, None } from '@lambdulus/core';
import { EvaluationStrategy, StepValidity, UntypedLambdaState, UntypedLambdaType } from '../untyped-lambda-integration/Types';

afterEach(() => cleanup());

test('prime box owns the most of the upper view', () => {
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

test('the + row breathes a line-high on both sides', () => {
  // Small boxes need the vertical room for the scrolling autofocus,
  // and an open macro dock must not invade the box below.
  const css = readFileSync('src/styles/BoxContainer.css', 'utf8');
  const row = css.match(/\.add_box_after\s*\{[^}]*\}/)?.[0] ?? '';
  expect(row).toMatch(/margin\s*:\s*1\.5em\s+auto/);
});

test('cards drop the invisible rail so the card meets the + row', () => {
  // The rail is a transparent duplicate of the card's own click to
  // focus; hiding it lets the card stretch left edge-to-edge with
  // the full-width + row. Classic keeps its visible anchor line.
  const css = readFileSync('src/styles/BoxContainer.css', 'utf8');
  expect(css).toMatch(/#app\[data-box-style='cards'\] \.box-frame \.box-rail\s*\{[^}]*display\s*:\s*none/);
});

test('zen hides the collapse toggle', () => {
  // Collapsing the single zen box serves nothing, so the toggle
  // steps out with the other box furniture.
  const css = readFileSync('src/App.css', 'utf8');
  expect(css).toMatch(/\.mainSpace\.zen \.box-top-bar--collapse-toggle\s*\{[^}]*display\s*:\s*none/);
});

test('prime hands over once the next box owns the upper view', () => {
  // Scrolled further down, the next box fills most of the upper view
  // and takes the focus it was denied while it only owned the bottom.
  expect(selectPrimeBox([
    { top : -100, height : 400 },
    { top : 100, height : 900 },
  ], 520)).toBe(1);
});

test('a tiny middle box wins its window on a high prime line', () => {
  // One-term middle box, fully visible, predecessor almost gone, tall
  // last box rising below. On the old center-ish line (585 of 900) the
  // last box outshares it at every scroll position, so slow scrolling
  // skips the middle outright; on the upper-third line (315) the last
  // box has not entered the upper view yet and the middle box wins.
  const boxes = [
    { top : -350, height : 400 },
    { top : 162, height : 120 },
    { top : 394, height : 500 },
  ];
  expect(selectPrimeBox(boxes, 585)).toBe(2);
  expect(selectPrimeBox(boxes, 315)).toBe(1);
});

test('a seated short box keeps focus over the next one', () => {
  // Clicking the second-to-last box seats it at the top; the last box
  // sits above the line too, but the seated box owns as much of the
  // upper view, so the tie stays above instead of stealing down.
  expect(selectPrimeBox([
    { top : 60, height : 200 },
    { top : 280, height : 200 },
  ], 520)).toBe(0);
});

test('prime stays on the last box past the end', () => {
  // Scrolled past everything, nothing owns the upper view: the focus
  // rests on the last box rather than jumping back to the first.
  expect(selectPrimeBox([
    { top : -900, height : 200 },
    { top : -650, height : 200 },
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

function rect (top : number, height : number) : DOMRect {
  return {
    top,
    left : 0,
    bottom : top + height,
    right : 0,
    width : 0,
    height,
    x : 0,
    y : 0,
    toJSON : () => ({}),
  } as DOMRect;
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

test('zen wheel over the map pages one box per push', async () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    expect(nav).not.toBeNull();

    // One push past the travel bar steps exactly one box down.
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);
    expect(patches[0]).toMatchObject({ activeBoxIndex : 1, focusedBoxIndex : 1 });

    // The gesture's tail (trackpad momentum included) goes quiet:
    // pushing on inside the lock steps nothing more.
    fireEvent.wheel(nav, { deltaY : 120 });
    fireEvent.wheel(nav, { deltaY : 30 });
    expect(patches.length).toBe(1);

    // Pushing on after the lock re-arms the trigger, so continuous
    // scrolling keeps paging.
    await new Promise((resolve) => setTimeout(resolve, 400));
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(2);
  }
  finally {
    unmount();
  }
});

test('a flick with a long momentum tail still pages exactly once', async () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    const nap = (ms : number) => new Promise((resolve) => setTimeout(resolve, ms));

    // The flick: one decisive push pages at once.
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);

    // Its momentum tail runs half a second with no quiet gap: deaf
    // through all of it, never a second page.
    for (let i = 0; i < 12; i++) {
      await nap(40);
      fireEvent.wheel(nav, { deltaY : 18 });
    }
    expect(patches.length).toBe(1);

    // The next real push pages again.
    await nap(250);
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(2);
  }
  finally {
    unmount();
  }
});

test('a fresh push into the tail pages again at once', async () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    const nap = (ms : number) => new Promise((resolve) => setTimeout(resolve, ms));

    // The first swipe pages at once.
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);

    // Its cooling tail flows on, dense and decaying: deaf through all
    // of it, never a second page from the same swipe.
    for (const tail of [ 90, 75, 60, 50, 40, 32, 26, 21, 17, 14, 12, 10, 9, 8, 7 ]) {
      fireEvent.wheel(nav, { deltaY : tail });
    }
    expect(patches.length).toBe(1);

    // A new push ramping out of the cooled tail re-arms mid-gesture:
    // no trap gap, the second swipe pages without waiting out the
    // momentum — while its own third event correctly stays quiet.
    fireEvent.wheel(nav, { deltaY : 30 });
    fireEvent.wheel(nav, { deltaY : 45 });
    expect(patches.length).toBe(2);
    fireEvent.wheel(nav, { deltaY : 60 });
    expect(patches.length).toBe(2);

    // ...and the road after is normal again.
    await nap(250);
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(3);
  }
  finally {
    unmount();
  }
});

test('rapid mouse notches page per notch', async () => {
  const patches : Array<Partial<NotebookState>> = [];
  const mkState = (anchor : number) : NotebookState => ({
    name : 'Test',
    zenMode : true,
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : anchor,
    focusedBoxIndex : anchor,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  });
  const onPatch = (patch : Partial<NotebookState>) => { patches.push(patch); };
  const { container, unmount, rerender } = render(<Notebook state={ mkState(0) } updateNotebook={ onPatch } />);
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    const nap = (ms : number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Notches 100ms apart never reach the quiet window, but each is a
    // full discrete shove: every one pages.
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);
    expect(patches[0]).toMatchObject({ focusedBoxIndex : 1 });

    await nap(100);
    rerender(<Notebook state={ mkState(1) } updateNotebook={ onPatch } />);
    fireEvent.wheel(nav, { deltaY : -120 });
    expect(patches.length).toBe(2);
    expect(patches[1]).toMatchObject({ focusedBoxIndex : 0 });

    await nap(100);
    rerender(<Notebook state={ mkState(0) } updateNotebook={ onPatch } />);
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(3);
    expect(patches[2]).toMatchObject({ focusedBoxIndex : 1 });
  }
  finally {
    unmount();
  }
});

test('sustained scrolling cruises past the first window', async () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    const nap = (ms : number) => new Promise((resolve) => setTimeout(resolve, ms));

    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);

    // Steady pushing past the cap window: strength stays up, so the
    // stream cruises into a second page on its own.
    for (let t = 0; t < 2200; t += 50) {
      await nap(50);
      fireEvent.wheel(nav, { deltaY : 30 });
    }
    expect(patches.length).toBeGreaterThanOrEqual(2);

    // ...and keeps cruising on the short cadence while the flow runs.
    for (let t = 0; t < 400; t += 50) {
      await nap(50);
      fireEvent.wheel(nav, { deltaY : 30 });
    }
    expect(patches.length).toBeGreaterThanOrEqual(3);
  }
  finally {
    unmount();
  }
});

test('a gentle but deliberate re-push still pages', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;

    // Opening push pages at once; its tail dips low and stays quiet.
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);
    for (const tail of [ 60, 40, 25, 15, 10, 6, 4, 2 ]) {
      fireEvent.wheel(nav, { deltaY : tail });
    }
    expect(patches.length).toBe(1);

    // A soft ramp — no hard shove anywhere — re-arms on its first
    // event and pages once its travel arrives, still exactly once.
    fireEvent.wheel(nav, { deltaY : 28 });
    expect(patches.length).toBe(1);
    fireEvent.wheel(nav, { deltaY : 32 });
    expect(patches.length).toBe(2);
  }
  finally {
    unmount();
  }
});

test('micro-swipes peaking at single pixels still page', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    const stream = (deltas : Array<number>) => {
      for (const deltaY of deltas) {
        fireEvent.wheel(nav, { deltaY });
      }
    };

    // A gentle push totaling just past the bar pages, on small events.
    stream([ 1, 2, 3, 4, 6, 7, 8, 8, 8, 8, 7 ]);
    expect(patches.length).toBe(1);

    // Its tail dies out quietly, never a second page.
    stream([ 7, 6, 5, 4, 3, 2, 2, 1, 1 ]);
    expect(patches.length).toBe(1);

    // A re-push hump peaking at 8px re-arms through the low floor and
    // pages on its travel — while the event right after the page,
    // with no dip behind it, stays quiet.
    stream([ 5, 7, 8, 8, 8, 8, 8, 8, 7 ]);
    expect(patches.length).toBe(2);
    stream([ 8 ]);
    expect(patches.length).toBe(2);
  }
  finally {
    unmount();
  }
});

test('re-pushes inside one unbroken stream page push by push', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    const stream = (deltas : Array<number>) => {
      for (const deltaY of deltas) {
        fireEvent.wheel(nav, { deltaY });
      }
    };

    // The opening push pages at once; its tail never pages twice.
    stream([ 66 ]);
    expect(patches.length).toBe(1);
    stream([ 62, 60, 55, 48, 40, 32, 25, 18, 12, 8, 5, 3, 2 ]);
    expect(patches.length).toBe(1);

    // A re-push ramping out of the dip re-arms mid-flow and pages —
    // while its own continuation stays quiet.
    stream([ 9, 16, 26, 40 ]);
    expect(patches.length).toBe(2);
    stream([ 48 ]);
    expect(patches.length).toBe(2);

    // ...and the next hump pages again the same way.
    stream([ 45, 38, 30, 22, 15, 10, 6, 4, 3, 2 ]);
    expect(patches.length).toBe(2);
    stream([ 11, 26, 38 ]);
    expect(patches.length).toBe(3);
    stream([ 52, 73, 83, 70, 50, 30, 15, 8, 4, 2, 1 ]);
    expect(patches.length).toBe(3);
  }
  finally {
    unmount();
  }
});

test('a stalled tail held back past the window never pages twice', async () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;
    const nap = (ms : number) => new Promise((resolve) => setTimeout(resolve, ms));

    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);

    // The page's own re-render stalls the main thread: the tail event
    // was born mid-gesture but handled after a long wall pause. The
    // event clock betrays the stall, so the gesture stays one page.
    await nap(400);
    const stale = new WheelEvent('wheel', { deltaY : 40, bubbles : true, cancelable : true });
    Object.defineProperty(stale, 'timeStamp', { value : performance.now() - 350 });
    nav.dispatchEvent(stale);
    expect(patches.length).toBe(1);

    // A genuinely fresh push afterwards pages again.
    await nap(250);
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(2);
  }
  finally {
    unmount();
  }
});

test('zen wheel lets a scrolling map list keep the event', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); });
  try {
    const list = container.querySelector('.box-map-list') as HTMLElement;
    let top = 0;
    Object.defineProperty(list, 'scrollHeight', { value : 500, configurable : true });
    Object.defineProperty(list, 'clientHeight', { value : 100, configurable : true });
    Object.defineProperty(list, 'scrollTop', { get : () => top, set : (v : number) => { top = v; }, configurable : true });
    const nav = container.querySelector('.box-map') as HTMLElement;

    // Room below: the list scrolls, no paging.
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(0);

    // Scrolled to the end: paging continues past it.
    top = 400;
    fireEvent.wheel(nav, { deltaY : 120 });
    expect(patches.length).toBe(1);
    expect(patches[0]).toMatchObject({ focusedBoxIndex : 1 });
  }
  finally {
    unmount();
  }
});

test('zen swipe over the map pages, taps do not', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = renderZenNotebook((patch) => { patches.push(patch); }, 0);
  try {
    const nav = container.querySelector('.box-map') as HTMLElement;

    // Swipe up travels past the bar: one box forward.
    fireEvent.touchStart(nav, { touches : [ { clientY : 100 } ] });
    fireEvent.touchEnd(nav, { changedTouches : [ { clientY : 40 } ] });
    expect(patches.length).toBe(1);
    expect(patches[0]).toMatchObject({ focusedBoxIndex : 1 });

    // A tap stays under the bar: nothing pages.
    fireEvent.touchStart(nav, { touches : [ { clientY : 100 } ] });
    fireEvent.touchEnd(nav, { changedTouches : [ { clientY : 90 } ] });
    expect(patches.length).toBe(1);
  }
  finally {
    unmount();
  }
});

test('map wheel outside zen pages nothing', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ (patch) => { patches.push(patch); } } />);
  try {
    fireEvent.wheel(container.querySelector('.box-map') as HTMLElement, { deltaY : 500 });
    expect(patches.length).toBe(0);
  }
  finally {
    unmount();
  }
});

test('map paging hitbox reaches past a short map without covering the lines', () => {
  const { container, unmount } = renderZenNotebook(() => void 0);
  try {
    // The layer mounts behind the list content inside the nav.
    const hitbox = container.querySelector('.box-map > .box-map-hitbox') as HTMLElement;
    expect(hitbox).not.toBeNull();
    expect(hitbox.getAttribute('aria-hidden')).toBe('true');
  }
  finally {
    unmount();
  }

  const css = readFileSync('src/App.css', 'utf8');
  const block = css.match(/\.box-map-hitbox\s*\{[^}]*\}/)?.[0] ?? '';
  expect(block).toMatch(/top\s*:\s*-18vh/);
  expect(block).toMatch(/bottom\s*:\s*-18vh/);
  expect(block).toMatch(/z-index\s*:\s*-1/);
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

// One breakpoint's own block: the chunk from its @media up to the
// next @media (or the end), so wider blocks above never leak in.
function mediaBlock (css : string, breakpoint : string) : string {
  const chunks : Array<string> = css.split('@media')
  return chunks.find((chunk : string) => new RegExp(`max-width\\s*:\\s*${breakpoint}`).test(chunk)) ?? ''
}

test('narrow screens hide the box map instead of overlapping', () => {
  // Below the width where even the half map clears the slim column
  // (1372px), the map steps out entirely.
  const css = readFileSync('src/App.css', 'utf8');
  expect(mediaBlock(css, '1371px')).toMatch(/\.box-map\s*\{[^}]*display\s*:\s*none/);
});

test('below the slim column width the page goes fluid', () => {
  // A fixed 810px column would overflow viewports under 850px, so
  // the page padding owns the gutters instead.
  const css = readFileSync('src/App.css', 'utf8');
  expect(mediaBlock(css, '849px')).toMatch(/\.mainSpace\s*\{[^}]*max-width\s*:\s*none/);
});

test('below 480px the zen add-box docks to the page padding', () => {
  // The fixed right offset would push the capped button past the
  // left edge, so it rides the gutter instead.
  const css = readFileSync('src/App.css', 'utf8');
  expect(mediaBlock(css, '480px')).toMatch(/\.zen-add\s*\{[^}]*right\s*:\s*12px/);
});

test('below 580px the macro names give up their wide column', () => {
  // Every builtin fits in 52px and longer user macros wrap — the :=
  // column stays aligned, just further left.
  const css = readFileSync('src/untyped-lambda-integration/styles/MacroList.css', 'utf8');
  expect(mediaBlock(css, '579px')).toMatch(/\.macro-name\s*\{[^}]*min-width\s*:\s*52px/);
});

test('the zen picker options carry the card fill', () => {
  // The picker floats over box content; transparent rows would let
  // the box show through.
  const css = readFileSync('src/App.css', 'utf8');
  const options = css.match(/\.zen-add \.add-box--group\s*\{[^}]*\}/)?.[0] ?? '';
  expect(options).toMatch(/background-color\s*:\s*var\(--surface\)/);
});

test('the macro pill joins the flow once the gutter runs out', () => {
  // Below ~1080px the left gutter no longer fits the pill, so the
  // dock rides the top of its own box and grows it when open.
  const css = readFileSync('src/untyped-lambda-integration/styles/MacroList.css', 'utf8');
  const media = mediaBlock(css, '1080px');
  expect(media).toMatch(/\.macro-dock\s*\{[^}]*position\s*:\s*static/);
  expect(media).toMatch(/\.macro-dock--open\s*\{[^}]*min-height\s*:\s*0/);
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

test('entering zen parks the page at the top', () => {
  // Entering collapses every other box out of the layout; gliding to
  // the anchor would travel through space that no longer exists, so
  // the flip jumps to the top instantly: the anchor owns the viewport
  // by construction.
  const base : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 1,
    focusedBoxIndex : 1,
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
    expect(spy).toHaveBeenCalledWith({ top : 0, behavior : 'auto' });
  }
  finally {
    unmount();
    window.scrollTo = originalScrollTo;
  }
});

test('leaving zen seats the anchor instantly', () => {
  // Leaving brings the title and siblings back; seating the anchor
  // (instantly, no glide) lands it whatever shifted silently while
  // away. The box pinning steps aside across the flip, so no pin
  // scroll fires the prime sync mid-flip either.
  const base : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 1,
    focusedBoxIndex : 1,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const patches : Array<Partial<NotebookState>> = [];
  const onPatch = (patch : Partial<NotebookState>) : void => { patches.push(patch); };
  const originalScrollTo = window.scrollTo;
  const lockAtJump : Array<boolean> = [];
  const spy = vi.fn(() => {
    lockAtJump.push(document.body.classList.contains('zen'));
  });
  window.scrollTo = spy;
  const { rerender, unmount } = render(<Notebook state={ base } updateNotebook={ onPatch } />);
  try {
    rerender(<Notebook state={ { ...base, zenMode : true } } updateNotebook={ onPatch } />);
    spy.mockClear();
    lockAtJump.length = 0;
    rerender(<Notebook state={ { ...base, zenMode : false } } updateNotebook={ onPatch } />);
    // jsdom measures every box top at 0, so the 60px seat reads as
    // a -60 jump: what matters is that exit seats, instantly.
    expect(spy).toHaveBeenCalledWith({ top : -60, behavior : 'auto' });
    // The lock is already gone when the seat runs: under the zen lock
    // a deep seat would clamp back towards the top.
    expect(lockAtJump).toEqual([ false ]);
    // And nothing re-derives the focus: the anchor keeps it.
    expect(patches.some((patch) => patch.focusedBoxIndex !== undefined)).toBe(false);
  }
  finally {
    unmount();
    window.scrollTo = originalScrollTo;
  }
});

test('silent layout shifts re-prime the anchor', () => {
  // Async content settling can move the view without firing scroll
  // events, leaving focus stale on a box the view no longer shows;
  // the list observer re-primes from the new layout.
  let observerCallback : () => void = () => void 0;
  vi.stubGlobal('ResizeObserver', class {
    constructor (callback : () => void) {
      observerCallback = callback;
    }
    observe () : void { /* noop */ }
    unobserve () : void { /* noop */ }
    disconnect () : void { /* noop */ }
  });
  const patches : Array<Partial<NotebookState>> = [];
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b'), noteBox('third', 'c') ],
    activeBoxIndex : 1,
    focusedBoxIndex : 2,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ (patch) => { patches.push(patch); } } />);
  try {
    const rows = container.querySelectorAll('.boxList > .LI');
    const tops = [ 60, 280, 500 ];
    rows.forEach((row, i) => {
      (row as HTMLElement).getBoundingClientRect = () => rect(tops[i] ?? 0, 200);
    });
    observerCallback();
    expect(patches.some((patch) => patch.focusedBoxIndex === 0)).toBe(true);
  }
  finally {
    unmount();
    vi.unstubAllGlobals();
  }
});

function lambdaBox (key : string, dockOpen : boolean, dockWanted : boolean = dockOpen) : UntypedLambdaState {
  const box = createNewUntypedLambdaExpression(defaultSettings);
  box.__key = key;
  box.macrolistOpen = dockOpen;
  box.macrolistWanted = dockWanted;
  return box;
}

test('focus restores a remembered table and collapses the rest', () => {
  const first = lambdaBox('a', false, true);
  const note = noteBox('note', 'b');
  const second = lambdaBox('c', true, true);
  const next = syncDocksToFocus([ first, note, second ], 0);

  expect((next[0] as UntypedLambdaState).macrolistOpen).toBe(true);
  expect(next[1]).toBe(note);
  expect((next[2] as UntypedLambdaState).macrolistOpen).toBe(false);
  // Remembering survives the collapse, so refocus brings it back.
  expect((next[2] as UntypedLambdaState).macrolistWanted).toBe(true);
});

test('focus alone never opens a dock nobody asked for', () => {
  const shut = [ lambdaBox('a', false, false), noteBox('note', 'b'), lambdaBox('c', false, false) ];
  expect(syncDocksToFocus(shut, 0)).toBe(shut);
  expect(syncDocksToFocus(shut, 2)).toBe(shut);

  // A stray open table still collapses on blur — without opening another.
  const stray = [ lambdaBox('a', true, true), lambdaBox('b', false, false) ];
  const next = syncDocksToFocus(stray, 1);
  expect(next).not.toBe(stray);
  expect((next[0] as UntypedLambdaState).macrolistOpen).toBe(false);
  expect((next[1] as UntypedLambdaState).macrolistOpen).toBe(false);
});

test('zen focus never restores a remembered table', () => {
  const boxes = [ lambdaBox('a', true, true), lambdaBox('b', false, false) ];
  const next = syncDocksToFocus(boxes, 0, true);
  expect(next).not.toBe(boxes);
  expect((next[0] as UntypedLambdaState).macrolistOpen).toBe(false);
  // Remembered, not forgotten: leaving zen brings it back.
  expect((next[0] as UntypedLambdaState).macrolistWanted).toBe(true);
  expect(syncDocksToFocus(next, 0, false)).not.toBe(next);
  expect(((syncDocksToFocus(next, 0, false))[0] as UntypedLambdaState).macrolistOpen).toBe(true);
});

test('syncing docks is a no-op when every table matches', () => {
  const boxes = [ lambdaBox('a', true), noteBox('note', 'b'), lambdaBox('c', false) ];
  expect(syncDocksToFocus(boxes, 0)).toBe(boxes);
  const cleared = [ lambdaBox('a', false), noteBox('note', 'b') ];
  expect(syncDocksToFocus(cleared, undefined)).toBe(cleared);
});

test('a hand-closed dock stays shut across refocus', () => {
  // Open by hand, unfocused away, back again: remembered, restored.
  let boxes : Array<BoxState> = [ lambdaBox('a', false, true), lambdaBox('b', false, false) ];
  boxes = syncDocksToFocus(boxes, 0);
  expect((boxes[0] as UntypedLambdaState).macrolistOpen).toBe(true);
  boxes = syncDocksToFocus(boxes, 1);
  expect((boxes[0] as UntypedLambdaState).macrolistOpen).toBe(false);
  boxes = syncDocksToFocus(boxes, 0);
  expect((boxes[0] as UntypedLambdaState).macrolistOpen).toBe(true);

  // Closed by hand (head clears the wish): refocus leaves it shut.
  boxes = [ lambdaBox('a', false, false), lambdaBox('b', false, false) ];
  expect(syncDocksToFocus(boxes, 0)).toBe(boxes);
});

test('focusing a box collapses the old table and opens nothing unasked', () => {
  const state : NotebookState = {
    name : 'Test',
    boxList : [ lambdaBox('a', true), lambdaBox('b', false) ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const updateNotebook = vi.fn();
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ updateNotebook } />);
  try {
    fireEvent.click(container.querySelectorAll('.box-rail')[1]);
    expect(updateNotebook).toHaveBeenCalledWith(expect.objectContaining({ activeBoxIndex : 1, focusedBoxIndex : 1 }));
    const patched = updateNotebook.mock.calls[0][0] as NotebookState;
    expect((patched.boxList[0] as UntypedLambdaState).macrolistOpen).toBe(false);
    expect((patched.boxList[1] as UntypedLambdaState).macrolistOpen).toBe(false);
  }
  finally {
    unmount();
  }
});

function TwoLambdaHarness () : JSX.Element {
  const [ state, setState ] = useState<NotebookState>(() => ({
    name : 'Test',
    boxList : [ lambdaBox('a', false, false), lambdaBox('b', false, false) ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  }));
  return <Notebook state={ state } updateNotebook={ (patch : Partial<NotebookState>) => setState((prev) => ({ ...prev, ...patch })) } />;
}

test('pill toggles open on the first click, even unfocused', () => {
  // The pill click bubbles into the container's focus sync, which
  // recomputes the docks from pre-toggle props: the toggle must win
  // anyway, not get swallowed into a focus move.
  const { container, unmount } = render(<TwoLambdaHarness />);
  try {
    const heads = container.querySelectorAll('.macro-dock--head');
    expect(heads.length).toBe(2);

    fireEvent.click(heads[1]);

    const frames = container.querySelectorAll('.box-frame');
    expect(frames[1].querySelector('.macro-dock--open')).not.toBeNull();
    expect(frames[0].querySelector('.macro-dock--open')).toBeNull();
  }
  finally {
    unmount();
  }
});

function ZenHarness () : JSX.Element {
  const [ state, setState ] = useState<NotebookState>(() => ({
    name : 'Test',
    zenMode : true,
    boxList : [ lambdaBox('a', false, false) ],
    activeBoxIndex : 0,
    // Fresh box after a refresh: focus never landed on it.
    focusedBoxIndex : undefined,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  }));
  return <Notebook state={ state } updateNotebook={ (patch : Partial<NotebookState>) => setState((prev) => ({ ...prev, ...patch })) } />;
}

test('pill opens first try in zen on an unfocused box', () => {
  // Zen restores nothing, so the bubbled focus sync recomputes the
  // just-toggled dock closed: the toggle must win anyway, and the box
  // must own the focus afterwards like every other control click.
  const { container, unmount } = render(<ZenHarness />);
  try {
    fireEvent.click(container.querySelector('.macro-dock--head') as HTMLElement);

    const frame = container.querySelector('.box-frame') as HTMLElement;
    expect(frame.querySelector('.macro-dock--open')).not.toBeNull();
    expect(frame.classList.contains('box-frame--focused')).toBe(true);
  }
  finally {
    unmount();
  }
});

test('pill survives a blur-first click from an editing box', () => {
  // Live browsers blur the focused editor on mousedown, before the
  // pill click lands: the blur collapse must not eat the toggle.
  const { container, unmount } = render(<TwoLambdaHarness />);
  try {
    // Focus the first box, then blur it like a pill mousedown would.
    fireEvent.click(container.querySelectorAll('.box-rail')[0]);
    const editors = container.querySelectorAll('.box-frame')[0].querySelectorAll('textarea, input, [contenteditable="true"]');
    if (editors.length > 0) {
      (editors[0] as HTMLElement).focus();
    }
    fireEvent.focusOut(container.querySelectorAll('.boxContainer')[0]);

    fireEvent.click(container.querySelectorAll('.macro-dock--head')[1]);

    const frames = container.querySelectorAll('.box-frame');
    expect(frames[1].querySelector('.macro-dock--open')).not.toBeNull();
  }
  finally {
    unmount();
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
    expect(frames[0].classList.contains('box-frame--anchor')).toBe(true);
    expect(frames[1].classList.contains('box-frame--anchor')).toBe(false);

    fireEvent.click(rails[1]);
    expect(updateNotebook).toHaveBeenCalledWith(expect.objectContaining({ activeBoxIndex : 1, focusedBoxIndex : 1 }));
  }
  finally {
    unmount();
  }
});

test('boxes show up as cards', () => {
  // The box itself is the card: theme surface, a full border, a
  // radius, a quiet shadow; the anchor box (the one the map marks)
  // lifts with a deeper one. No frame pseudo-element draws anything
  // anymore.
  const app = readFileSync('src/App.css', 'utf8');
  const card = app.match(/\.boxContainer\s*\{[^}]*\}/)?.[0] ?? '';
  expect(card).toMatch(/background\s*:\s*var\(--surface\)/);
  expect(card).toMatch(/border\s*:\s*1px solid var\(--border\)/);
  expect(card).toMatch(/border-radius\s*:\s*12px/);
  expect(card).toMatch(/box-shadow\s*:\s*var\(--shadow\)/);
  expect(app).toMatch(/\.box-frame--anchor \.boxContainer\s*\{[^}]*box-shadow\s*:\s*var\(--shadow-lift\)/);
  const frame = readFileSync('src/styles/BoxContainer.css', 'utf8');
  expect(frame).not.toMatch(/::after/);
});

test('classic boxes wear the rail, not the card', () => {
  // Opt-in variant: flat boxes divided by a hairline, no lift, and a
  // thin full-height rail line lighting the anchor in accent.
  const app = readFileSync('src/App.css', 'utf8');
  const flat = app.match(/#app\[data-box-style='classic'\] \.boxContainer\s*\{[^}]*\}/)?.[0] ?? '';
  expect(flat).toMatch(/background\s*:\s*transparent/);
  expect(flat).toMatch(/border-bottom\s*:\s*1px solid var\(--border\)/);
  expect(flat).toMatch(/border-radius\s*:\s*0/);
  expect(flat).toMatch(/box-shadow\s*:\s*none/);
  expect(app).toMatch(/#app\[data-box-style='classic'\] \.box-frame--anchor \.boxContainer\s*\{[^}]*box-shadow\s*:\s*none/);
  const frame = readFileSync('src/styles/BoxContainer.css', 'utf8');
  const rail = frame.match(/#app\[data-box-style='classic'\] \.box-rail::before\s*\{[^}]*\}/)?.[0] ?? '';
  expect(rail).toMatch(/width\s*:\s*2px/);
  expect(rail).toMatch(/background-color\s*:\s*var\(--border\)/);
  expect(frame).toMatch(/#app\[data-box-style='classic'\] \.box-frame--anchor \.box-rail::before\s*\{[^}]*background-color\s*:\s*var\(--accent\)/);
});

test('map highlight and card lift share one anchor', () => {
  // Clicks (active) and scroll-prime (focused) diverge by design; the
  // visible focus must not. With active on the first box and focused
  // on the second, both the map accent and the card lift sit on the
  // second: the anchor both follow.
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 1,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ () => void 0 } />);
  try {
    const frames = container.querySelectorAll('.box-frame');
    expect(frames[0].classList.contains('box-frame--anchor')).toBe(false);
    expect(frames[1].classList.contains('box-frame--anchor')).toBe(true);
    const items = container.querySelectorAll('.box-map-item');
    expect(items[0].classList.contains('box-map-item--current')).toBe(false);
    expect(items[1].classList.contains('box-map-item--current')).toBe(true);
  }
  finally {
    unmount();
  }
});

test('scroll-end sync re-primes from the landed layout', async () => {
  // A seat-glide that outlasts the settle guard can re-prime from
  // mid-flight geometry (here the focus sits on the last box); once
  // motion stops the trailing sync measures the landed layout, where
  // the first box owns as much of the upper view as the second, and
  // fixes the anchor on it. The frame sync is stubbed out to isolate
  // the trailing path.
  const originalRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = () : number => 1;
  const patches : Array<Partial<NotebookState>> = [];
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b'), noteBox('third', 'c') ],
    activeBoxIndex : 1,
    focusedBoxIndex : 2,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  const { container, unmount } = render(<Notebook state={ state } updateNotebook={ (patch) => { patches.push(patch); } } />);
  try {
    const rows = container.querySelectorAll('.boxList > .LI');
    const tops = [ 60, 280, 500 ];
    rows.forEach((row, i) => {
      (row as HTMLElement).getBoundingClientRect = () => rect(tops[i] ?? 0, 200);
    });
    fireEvent.scroll(window);
    await new Promise((resolve) => setTimeout(resolve, 250));
    expect(patches.some((patch) => patch.focusedBoxIndex === 0)).toBe(true);
  }
  finally {
    unmount();
    window.requestAnimationFrame = originalRaf;
  }
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

function deleteNotebook (onPatch : (patch : Partial<NotebookState>) => void, confirmBoxDelete : boolean = true, onConfirm : (confirm : boolean) => void = () => void 0) {
  const state : NotebookState = {
    name : 'Test',
    boxList : [ noteBox('first', 'a'), noteBox('second', 'b') ],
    activeBoxIndex : 0,
    focusedBoxIndex : 0,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
  return render(
    <Notebook
      state={ state }
      updateNotebook={ onPatch }
      confirmBoxDelete={ confirmBoxDelete }
      onConfirmBoxDeleteChange={ onConfirm }
    />
  );
}

const TRASH = '[title="Delete this Box from the Notebook"]';

function clickFirstTrash (container : HTMLElement) : void {
  fireEvent.click(container.querySelectorAll(TRASH)[0] as HTMLElement);
}

test('trash with asking on parks a dialog and deletes nothing', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = deleteNotebook((patch) => { patches.push(patch); });
  try {
    clickFirstTrash(container);
    expect(patches.length).toBe(0);
    expect(container.querySelector('.box-delete-confirm')).not.toBeNull();
  }
  finally {
    unmount();
  }
});

test('dialog delete removes the box, cancel keeps it', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = deleteNotebook((patch) => { patches.push(patch); });
  try {
    clickFirstTrash(container);
    fireEvent.click(container.querySelector('.box-delete-confirm-cancel') as HTMLElement);
    expect(patches.length).toBe(0);
    expect(container.querySelector('.box-delete-confirm')).toBeNull();

    clickFirstTrash(container);
    fireEvent.click(container.querySelector('.box-delete-confirm-delete') as HTMLElement);
    expect(patches.length).toBe(1);
    expect(patches[0].boxList?.length).toBe(1);
    expect(container.querySelector('.box-delete-confirm')).toBeNull();
  }
  finally {
    unmount();
  }
});

test('dont-ask-again applies on either button', () => {
  const seen : Array<boolean> = [];
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = deleteNotebook((patch) => { patches.push(patch); }, true, (confirm) => { seen.push(confirm); });
  try {
    // Cancel with the box checked: kept, but asking turns off.
    clickFirstTrash(container);
    fireEvent.click(container.querySelector('.box-delete-confirm-again input') as HTMLElement);
    fireEvent.click(container.querySelector('.box-delete-confirm-cancel') as HTMLElement);
    expect(patches.length).toBe(0);
    expect(seen).toEqual([ false ]);

    // Delete with the box checked: removed, asking turns off.
    clickFirstTrash(container);
    fireEvent.click(container.querySelector('.box-delete-confirm-again input') as HTMLElement);
    fireEvent.click(container.querySelector('.box-delete-confirm-delete') as HTMLElement);
    expect(patches.length).toBe(1);
    expect(patches[0].boxList?.length).toBe(1);
    expect(seen).toEqual([ false, false ]);
  }
  finally {
    unmount();
  }
});

test('trash with asking off deletes outright', () => {
  const patches : Array<Partial<NotebookState>> = [];
  const { container, unmount } = deleteNotebook((patch) => { patches.push(patch); }, false);
  try {
    clickFirstTrash(container);
    expect(container.querySelector('.box-delete-confirm')).toBeNull();
    expect(patches.length).toBe(1);
    expect(patches[0].boxList?.length).toBe(1);
  }
  finally {
    unmount();
  }
});
