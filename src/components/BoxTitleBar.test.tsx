import { readFileSync } from 'fs';
import React from 'react';
import { test, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import BoxTitleBar from './BoxTitleBar';
import { BoxType, BoxState } from '../Types';
import { createNewUntypedLambdaExpression, defaultSettings, SETTINGS_OPENED_EVENT } from '../untyped-lambda-integration/Constants';

afterEach(() => cleanup());

function props (state : BoxState) {
  return {
    state,
    isActive : true,
    isFocused : true,
    seatBox : () => void 0,
    makeActive : () => void 0,
    removeBox : () => void 0,
    updateBoxState : () => void 0,
    addBoxBefore : () => void 0,
    addBoxAfter : () => void 0,
    hideTitle : true,
  };
}

test('lambda title bar carries no macro toggle', () => {
  // The macro dock owns its pill now; nothing toggle-like remains in
  // the bar, left or right.
  const state = { type : BoxType.UNTYPED_LAMBDA, title : '', minimized : false } as unknown as BoxState;
  const { container } = render(<BoxTitleBar { ...props(state) } />);

  expect(container.querySelector('.box-top-bar-custom--left')).toBeNull();
  expect(container.querySelector('[title*="acro"]')).toBeNull();
});

test('markdown keeps its right-side custom group', () => {
  const state = { type : BoxType.MARKDOWN, title : 'Note' } as unknown as BoxState;
  const { container } = render(<BoxTitleBar { ...props(state) } hideTitle={ false } />);

  expect(container.querySelector('.box-top-bar-custom--left')).toBeNull();
  expect(container.querySelector('.box-top-bar-custom')).not.toBeNull();
});

function bar (settingsOpen : boolean, updateBoxState : (box : BoxState) => void) {
  const state = createNewUntypedLambdaExpression(defaultSettings);
  state.type = BoxType.UNTYPED_LAMBDA;
  state.settingsOpen = settingsOpen;
  return render(
    <BoxTitleBar
      state={ state }
      isActive={ true }
      isFocused={ true }
      seatBox={ () => void 0 }
      makeActive={ () => void 0 }
      removeBox={ () => void 0 }
      updateBoxState={ updateBoxState }
      addBoxBefore={ () => void 0 }
      addBoxAfter={ () => void 0 }
    />
  );
}

const GEAR = '[title="Open this Boxs\' settings"]';

test('opening settings from the gear broadcasts for other boxes', () => {
  const heard : Array<string> = [];
  const onOpened = (event : Event) => {
    heard.push((event as CustomEvent<{ key : string }>).detail.key);
  };
  document.addEventListener(SETTINGS_OPENED_EVENT, onOpened);
  const updated : Array<BoxState> = [];
  try {
    const { container, unmount } = bar(false, (box) => { updated.push(box); });
    try {
      fireEvent.click(container.querySelector(GEAR) as HTMLElement);
      expect(updated.length).toBe(1);
      expect((updated[0] as { settingsOpen : boolean }).settingsOpen).toBe(true);
      expect(heard).toEqual([ (updated[0] as { __key : string }).__key ]);
    }
    finally {
      unmount();
    }
  }
  finally {
    document.removeEventListener(SETTINGS_OPENED_EVENT, onOpened);
  }
});

test('closing settings from the gear broadcasts nothing', () => {
  const heard : Array<string> = [];
  const onOpened = (event : Event) => {
    heard.push((event as CustomEvent<{ key : string }>).detail.key);
  };
  document.addEventListener(SETTINGS_OPENED_EVENT, onOpened);
  const updated : Array<BoxState> = [];
  try {
    const { container, unmount } = bar(true, (box) => { updated.push(box); });
    try {
      fireEvent.click(container.querySelector(GEAR) as HTMLElement);
      expect(updated.length).toBe(1);
      expect((updated[0] as { settingsOpen : boolean }).settingsOpen).toBe(false);
      expect(heard).toEqual([]);
    }
    finally {
      unmount();
    }
  }
  finally {
    document.removeEventListener(SETTINGS_OPENED_EVENT, onOpened);
  }
});

test('compact box menu opens, closes on icon tap and outside tap', () => {
  const { container } = bar(false, () => void 0);
  const toggle = container.querySelector('[title="Open box actions"]') as HTMLElement;
  const controls = container.querySelector('.box-top-bar-controls') as HTMLElement;

  expect(controls.classList.contains('box-top-bar-controls--open')).toBe(false);

  // The toggle opens the icon popup.
  fireEvent.click(toggle);
  expect(controls.classList.contains('box-top-bar-controls--open')).toBe(true);

  // Tapping an icon closes it again, before the action itself runs.
  fireEvent.click(container.querySelector('[title="Collapse this Box"]') as HTMLElement);
  expect(controls.classList.contains('box-top-bar-controls--open')).toBe(false);

  // Tapping anywhere else closes it too.
  fireEvent.click(toggle);
  fireEvent.mouseDown(document.body);
  expect(controls.classList.contains('box-top-bar-controls--open')).toBe(false);
});

test('taps on the tour card leave the compact menu open', () => {
  // Every Next tap would otherwise shut the menu a beat before the
  // step sync re-opens it, flickering through each settings step.
  const { container } = bar(false, () => void 0);
  fireEvent.click(container.querySelector('[title="Open box actions"]') as HTMLElement);
  const controls = container.querySelector('.box-top-bar-controls') as HTMLElement;
  expect(controls.classList.contains('box-top-bar-controls--open')).toBe(true);

  const tour = document.createElement('div');
  tour.className = 'tour';
  const next = document.createElement('button');
  next.textContent = 'Next';
  tour.appendChild(next);
  document.body.appendChild(tour);
  try {
    fireEvent.mouseDown(next);
    expect(controls.classList.contains('box-top-bar-controls--open')).toBe(true);
    fireEvent.mouseDown(document.body);
    expect(controls.classList.contains('box-top-bar-controls--open')).toBe(false);
  }
  finally {
    tour.remove();
  }
});

test('box settings float above the macro dock', () => {
  // The panel opens over the pill's corner; the dock must never win
  // their overlap.
  const css = readFileSync('src/untyped-lambda-integration/styles/Settings.css', 'utf8');
  const panel = css.match(/\.box-settings\s*\{[^}]*\}/)?.[0] ?? '';
  expect(panel).toMatch(/z-index\s*:\s*60/);
});

test('below 430px the box settings pin to both sides', () => {
  // The capped panel would spill past the left edge; uncapped with a
  // fixed 8px gap left and right it always fits the box.
  const css = readFileSync('src/untyped-lambda-integration/styles/Settings.css', 'utf8');
  const start = css.search(/@media[^{]*max-width\s*:\s*429px/);
  expect(start).toBeGreaterThan(-1);
  const media = css.slice(start);
  expect(media).toMatch(/\.box-settings\s*\{[^}]*width\s*:\s*auto/);
  expect(media).toMatch(/\.box-settings\s*\{[^}]*left\s*:\s*8px/);
});

test('below 420px the box icons fold under a toggle', () => {
  // The row hides, the hamburger shows, and the open node drops as a
  // horizontal icon popup — morphing to an X, labels nowhere.
  const css = readFileSync('src/styles/BoxTopBar.css', 'utf8');
  const media = css.slice(css.search(/@media[^{]*max-width\s*:\s*419px/));
  expect(media).toMatch(/\.box-top-bar-controls\s*\{[^}]*display\s*:\s*none/);
  expect(media).toMatch(/\.box-top-bar-controls--open\s*\{[^}]*position\s*:\s*absolute/);
  expect(media).toMatch(/\.box-top-bar-controls--open\s*\{[^}]*flex-direction\s*:\s*row/);
  expect(css).toMatch(/\.box-top-bar--compact-toggle--open \.box-top-bar--compact-bar:nth-child\(1\)\s*\{[^}]*transform\s*:\s*rotate\(45deg\)/);
  expect(css).not.toMatch(/box-top-bar--compact-toggle[\s\S]*top-bar--action-label/);
});
