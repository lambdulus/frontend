import React, { useState } from 'react';
import { test, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import UntypedLambdaBox from './UntypedLambdaBox';
import { createNewUntypedLambdaExpression, CODE_NAME as UNTYPED_CODE_NAME } from './Constants';
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
