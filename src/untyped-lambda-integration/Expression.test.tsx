import React from 'react';
import { test, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import Expression from './Expression';
import { EvaluationStrategy, StepValidity, UntypedLambdaState } from './Types';
import { tokenize, parse, None } from '@lambdulus/core';

afterEach(() => cleanup());

function buildHistory () {
  const macrotable = {};
  const ast = parse(tokenize('(λx.x) y', { lambdaLetters : ['λ'], singleLetterVars : true, macromap : macrotable }), macrotable);
  const message = { validity : StepValidity.CORRECT, userInput : '', message : '' };
  return [
    { ast, lastReduction : new None(), step : 0, message, isNormalForm : false, exerciseStep : false },
    { ast : ast.clone(), lastReduction : new None(), step : 1, message, isNormalForm : false, exerciseStep : false },
  ];
}

function renderExpression () {
  const history = buildHistory();
  const state = {
    strategy : EvaluationStrategy.NORMAL,
    SDE : true,
    macrotable : {},
    collapseOldSteps : true,
    isRunning : false,
  } as unknown as UntypedLambdaState;

  return render(
    <Expression
      className='box boxEval'
      state={ state }
      breakpoints={ [] }
      history={ history }
      editor={ { placeholder : '', content : '', syntaxError : null } }
      isNormalForm={ false }
      isExercise={ false }
      createBoxFrom={ () => state }
      setBoxState={ () => void 0 }
      onContent={ () => void 0 }
      onEnter={ () => void 0 }
      onExecute={ () => void 0 }
      addBox={ () => void 0 }
      shouldShowDebugControls={ false }
    />
  );
}

test('past steps scroll while the latest step is pinned outside', () => {
  const { container } = renderExpression();

  const scrolled = container.querySelectorAll('.box-history-scroll li.inactiveStep');
  expect(scrolled.length).toBe(1);
  expect(scrolled[0].textContent).toMatch(/0 :/);

  const current = container.querySelector('.box-current-step');
  expect(current).not.toBeNull();
  expect(container.querySelector('.box-history-scroll .box-current-step')).toBeNull();
  expect(current?.querySelector('.stepNumber')?.textContent).toMatch(/1 :/);
});

test('gap indicator mounts hidden while history reaches the current form', () => {
  const { container } = renderExpression();

  const indicator = container.querySelector('.history-gap-indicator');
  expect(indicator).not.toBeNull();
  expect(indicator?.classList.contains('visible')).toBe(false);
});

test('no indicator mounts when there is no history yet', () => {
  const { container } = render(
    <Expression
      className='box boxEval'
      state={ { strategy : EvaluationStrategy.NORMAL, SDE : true, macrotable : {}, collapseOldSteps : true, isRunning : false } as unknown as UntypedLambdaState }
      breakpoints={ [] }
      history={ buildHistory().slice(0, 1) }
      editor={ { placeholder : '', content : '', syntaxError : null } }
      isNormalForm={ false }
      isExercise={ false }
      createBoxFrom={ () => { throw new Error('unused') } }
      setBoxState={ () => void 0 }
      onContent={ () => void 0 }
      onEnter={ () => void 0 }
      onExecute={ () => void 0 }
      addBox={ () => void 0 }
      shouldShowDebugControls={ false }
    />
  );

  expect(container.querySelectorAll('.box-history-scroll li').length).toBe(0);
  expect(container.querySelector('.history-gap-indicator')).toBeNull();
  expect(container.querySelector('.box-current-step .stepNumber')?.textContent).toMatch(/0 :/);
});
