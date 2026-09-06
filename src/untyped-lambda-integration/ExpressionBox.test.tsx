import React, { createRef } from 'react';
import { test, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import ExpressionBox from './ExpressionBox';
import { EvaluationStrategy, StepValidity, UntypedLambdaState } from './Types';
import { tokenize, parse, None } from '@lambdulus/core';

afterEach(() => cleanup());

function buildState () : UntypedLambdaState {
  const macrotable = {};
  const ast = parse(tokenize('(λx.x) y', { lambdaLetters : ['λ'], singleLetterVars : true, macromap : macrotable }), macrotable);
  const message = { validity : StepValidity.CORRECT, userInput : '', message : '' };
  return {
    strategy : EvaluationStrategy.NORMAL,
    SDE : true,
    macrotable : {},
    history : [
      { ast, lastReduction : new None(), step : 0, message, isNormalForm : false, exerciseStep : false },
      { ast : ast.clone(), lastReduction : new None(), step : 1, message, isNormalForm : false, exerciseStep : false },
    ],
    breakpoints : [],
    editor : { placeholder : '', content : '', syntaxError : null },
    isRunning : false,
    minimized : false,
  } as unknown as UntypedLambdaState;
}

test('Run/Step portal into the title-bar slot when hosted', () => {
  const hostRef = createRef<HTMLSpanElement>();
  const { container } = render(
    <div>
      <span ref={ hostRef } />
      <ExpressionBox
        state={ buildState() }
        isActive={ true }
        isFocused={ true }
        setBoxState={ () => void 0 }
        addBox={ () => void 0 }
        titleActionsHost={ hostRef }
      />
    </div>
  );

  const host = container.querySelector('span');
  expect(host?.querySelector('.debug-controls--run')).not.toBeNull();
  expect(host?.querySelector('.debug-controls--step')).not.toBeNull();
  // ...and not duplicated in the old controls row below the editor
  expect(container.querySelectorAll('.debug-controls--run').length).toBe(1);
});

test('no controls render without a host slot', () => {
  const { container } = render(
    <ExpressionBox
      state={ buildState() }
      isActive={ true }
      isFocused={ true }
      setBoxState={ () => void 0 }
      addBox={ () => void 0 }
    />
  );

  expect(container.querySelector('.debug-controls--run')).toBeNull();
});
