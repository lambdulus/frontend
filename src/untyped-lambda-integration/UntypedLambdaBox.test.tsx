import React, { useState } from 'react';
import { test, expect, afterEach, vi } from 'vitest';
import { act, render, fireEvent, cleanup } from '@testing-library/react';
import { tokenize, parse, None } from '@lambdulus/core';
import UntypedLambdaBox from './UntypedLambdaBox';
import { createNewUntypedLambdaExpression, defaultSettings, CODE_NAME as UNTYPED_CODE_NAME } from './Constants';
import { UntypedLambdaState, UntypedLambdaType, StepValidity } from './Types';

afterEach(() => cleanup());

function Harness ({ initial, host } : { initial : UntypedLambdaState, host? : HTMLSpanElement }) {
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
      titleActionsHost={ host ? { current : host } : undefined }
    />
  );
}

function lastState () : UntypedLambdaState {
  return (globalThis as { __lastState ?: UntypedLambdaState }).__lastState as UntypedLambdaState;
}

function exerciseHarness (content : string, setup : (initial : UntypedLambdaState) => void = () => void 0) {
  // An exercised `(λ x . x x) a` waiting for its first manual step, with
  // the exercise input prefilled — no click-driving, so no post-mount
  // state wrestling.
  const initial = createNewUntypedLambdaExpression(defaultSettings);
  const ast = parse(tokenize('(λ x . x x) a', { lambdaLetters : [ 'λ' ], singleLetterVars : true, macromap : {} }), {});
  initial.subtype = UntypedLambdaType.EXERCISE;
  initial.macrotable = {};
  initial.ast = ast;
  initial.expression = '(λ x . x x) a';
  initial.history = [ {
    ast : ast.clone(),
    lastReduction : new None(),
    step : 0,
    message : { validity : StepValidity.CORRECT, userInput : '', message : '' },
    isNormalForm : false,
    exerciseStep : true,
  } ];
  initial.editor.content = content;
  setup(initial);

  return render(<Harness initial={ initial } />);
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

function pressEnter (container : HTMLElement) : void {
  // The Enter handler hangs off a capture listener inside the editor
  // field: dispatching at the container would never descend to it.
  const field = (container.querySelector('.editorContainer .editor') as HTMLElement).firstElementChild as HTMLElement;
  fireEvent.keyDown(field, { key : 'Enter' });
}

test('exercise Enter on garbage shows the syntax error instead of swallowing it', () => {
  const { container, unmount } = exerciseHarness('(', (initial) => { initial.SDE = false; });
  try {
    pressEnter(container);
    expect(lastState().editor.syntaxError).not.toBeNull();
    expect(container.querySelector('.editorError')).not.toBeNull();
  }
  finally {
    unmount();
  }
});

test('exercise Enter on garbage shows the syntax error with SDE on', () => {
  const { container, unmount } = exerciseHarness('()', (initial) => { initial.SDE = true; });
  try {
    pressEnter(container);
    expect(lastState().editor.syntaxError).not.toBeNull();
    expect(container.querySelector('.editorError')).not.toBeNull();
  }
  finally {
    unmount();
  }
});

test('exercise Enter on empty input steps for you, error-free', () => {
  const { container, unmount } = exerciseHarness('');
  try {
    pressEnter(container);
    expect(lastState().history.length).toBe(2);
    expect(lastState().editor.syntaxError).toBeNull();
  }
  finally {
    unmount();
  }
});

test('RUN performs the trailing eta conversion instead of stopping', () => {
  // Regression for #18: (λ s z . s z) is eta-reducible, so RUN must convert
  // it like STEP does instead of declaring a normal form up front.
  vi.useFakeTimers();
  try {
    const initial = createNewUntypedLambdaExpression(defaultSettings);
    const ast = parse(tokenize('(λ s z . s z)', { lambdaLetters : [ 'λ' ], singleLetterVars : true, macromap : {} }), {});
    initial.subtype = UntypedLambdaType.ORDINARY;
    initial.ETA = true; // trailing eta conversion is opt-in
    initial.macrotable = {};
    initial.ast = ast;
    initial.history = [ {
      ast : ast.clone(),
      lastReduction : new None(),
      step : 0,
      message : { validity : StepValidity.CORRECT, userInput : '', message : '' },
      isNormalForm : false,
      exerciseStep : false,
    } ];
    const host = document.createElement('span');
    document.body.appendChild(host);
    const { unmount } = render(<Harness initial={ initial } host={ host } />);
    try {
      fireEvent.click(host.querySelector('.debug-controls--run') as HTMLElement);
      for (let i = 0; i < 10 && lastState().isRunning; i++) {
        act(() => { vi.advanceTimersByTime(50); });
      }
      const last = lastState();
      expect(last.isRunning).toBe(false);
      expect(last.history.map((record) => record.ast.toString())).toContain('(λ s . s)');
      expect(last.history[last.history.length - 1].isNormalForm).toBe(true);
    }
    finally {
      unmount();
      host.remove();
    }
  }
  finally {
    vi.useRealTimers();
  }
});

test('plain RUN without ETA stops at beta-normal form', () => {
  // Trailing eta conversion is opt-in: + 1 0 with simplified disabled must
  // end readable, not eta-collapsed to (λ s . s).
  vi.useFakeTimers();
  try {
    const initial = createNewUntypedLambdaExpression(defaultSettings);
    const ast = parse(tokenize('+ 1 0', { lambdaLetters : [ 'λ' ], singleLetterVars : true, macromap : {} }), {});
    initial.subtype = UntypedLambdaType.ORDINARY;
    initial.SDE = false;
    initial.macrotable = {};
    initial.ast = ast;
    initial.history = [ {
      ast : ast.clone(),
      lastReduction : new None(),
      step : 0,
      message : { validity : StepValidity.CORRECT, userInput : '', message : '' },
      isNormalForm : false,
      exerciseStep : false,
    } ];
    const host = document.createElement('span');
    document.body.appendChild(host);
    const { unmount } = render(<Harness initial={ initial } host={ host } />);
    try {
      fireEvent.click(host.querySelector('.debug-controls--run') as HTMLElement);
      for (let i = 0; i < 300 && lastState().isRunning; i++) {
        act(() => { vi.advanceTimersByTime(50); });
      }
      const last = lastState();
      expect(last.isRunning).toBe(false);
      expect(last.history.map((record) => record.ast.toString())).not.toContain('(λ s . s)');
      expect(last.history[last.history.length - 1].isNormalForm).toBe(true);
    }
    finally {
      unmount();
      host.remove();
    }
  }
  finally {
    vi.useRealTimers();
  }
});

test('exercise created at an eta-redex is not marked normal', () => {
  // The #18 exercise leg: starting an exercise at (λ s z . s z) must leave
  // room for the trailing eta conversion instead of blocking stepping.
  const initial = createNewUntypedLambdaExpression(defaultSettings);
  initial.ETA = true; // trailing eta conversion is opt-in
  initial.editor.content = '(λ s z . s z)';

  const { container, unmount } = render(<Harness initial={ initial } />);
  try {
    fireEvent.click(container.querySelector('.open-as-exercise') as HTMLElement);
    const last = lastState();
    expect(last.editor.syntaxError).toBeNull();
    expect(last.subtype).toBe(UntypedLambdaType.EXERCISE);
    expect(last.history[0].isNormalForm).toBe(false);
  }
  finally {
    unmount();
  }
});
