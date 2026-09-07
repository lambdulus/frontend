import React, { useState } from 'react';
import { test, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import UntypedLambdaBox from './UntypedLambdaBox';
import { createNewUntypedLambdaExpression, defaultSettings, CODE_NAME as UNTYPED_CODE_NAME } from './Constants';
import { UntypedLambdaState, UntypedLambdaType } from './Types';

afterEach(() => cleanup());

function Harness ({ initial } : { initial : UntypedLambdaState }) {
  const [ state, setState ] = useState(initial);
  (globalThis as { __lastState ?: UntypedLambdaState }).__lastState = state;
  return (
    <UntypedLambdaBox
      state={ state }
      isActive={ true }
      isFocused={ true }
      isAnchorBox={ true }
      setBoxState={ setState }
      addBox={ () => void 0 }
    />
  );
}

function lastState () : UntypedLambdaState {
  return (globalThis as { __lastState ?: UntypedLambdaState }).__lastState as UntypedLambdaState;
}

function openSettingsHarness () {
  const initial = createNewUntypedLambdaExpression(defaultSettings);
  initial.settingsOpen = true;
  return render(<Harness initial={ initial } />);
}

test('settings close on mousedown outside the panel', () => {
  const { container, unmount } = openSettingsHarness();
  try {
    expect(container.querySelector('.box-settings')).not.toBeNull();
    fireEvent.mouseDown(container);
    expect(lastState().settingsOpen).toBe(false);
    expect(container.querySelector('.box-settings')).toBeNull();
  }
  finally {
    unmount();
  }
});

test('settings survive mousedown inside the panel, on the gear, and in the tour', () => {
  const { container, unmount } = openSettingsHarness();
  try {
    fireEvent.mouseDown(container.querySelector('.box-settings') as HTMLElement);
    expect(lastState().settingsOpen).toBe(true);

    // The gear owns its toggle click; the outside beat must not fight it.
    // (The harness renders the box without its title bar, so a stub with
    // the real title stands in for the gear outside the panel.)
    const gear = document.createElement('div');
    gear.setAttribute('title', 'Open this Boxs\' settings');
    container.appendChild(gear);
    fireEvent.mouseDown(gear);
    expect(lastState().settingsOpen).toBe(true);

    // The tour conducts panels deliberately step by step.
    const tour = document.createElement('div');
    tour.className = 'tour';
    container.appendChild(tour);
    fireEvent.mouseDown(tour);
    expect(lastState().settingsOpen).toBe(true);
  }
  finally {
    unmount();
  }
});

test('box created from a settings-less notebook submits + 2 3', () => {
  // End-to-end regression for the creation bug: the modal builds the box
  // from settings[UNTYPED_CODE_NAME], which is undefined for notebooks
  // decoded from years-old storage — submit must still evaluate.
  const notebookSettings = {};
  const modalSettings = (notebookSettings as Record<string, UntypedLambdaState>)[UNTYPED_CODE_NAME];
  const initial = createNewUntypedLambdaExpression(modalSettings);
  initial.editor.content = '+ 2 3';

  const { container } = render(<Harness initial={ initial } />);
  fireEvent.click(container.querySelector('.open-as-debug') as HTMLElement);

  const last = lastState();
  expect(last.editor.syntaxError).toBeNull();
  expect(last.subtype).toBe(UntypedLambdaType.ORDINARY);
});
