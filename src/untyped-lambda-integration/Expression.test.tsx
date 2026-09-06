import React from 'react';
import { readFileSync } from 'fs';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
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
    { ast : ast.clone(), lastReduction : new None(), step : 2, message, isNormalForm : false, exerciseStep : false },
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

test('initial and latest steps pin outside while middle steps scroll', () => {
  const { container } = renderExpression();

  const initial = container.querySelector('.box-initial-step');
  expect(initial).not.toBeNull();
  expect(container.querySelector('.box-history-scroll .box-initial-step')).toBeNull();
  expect(initial?.querySelector('.stepNumber')?.textContent).toMatch(/0 :/);

  const scrolled = container.querySelectorAll('.box-history-scroll li.inactiveStep');
  expect(scrolled.length).toBe(1);
  expect(scrolled[0].textContent).toMatch(/1 :/);

  const current = container.querySelector('.box-current-step');
  expect(current).not.toBeNull();
  expect(container.querySelector('.box-history-scroll .box-current-step')).toBeNull();
  expect(current?.querySelector('.stepNumber')?.textContent).toMatch(/2 :/);
});

test('two steps pin both endpoints with no marks and no middle', () => {
  const { container } = render(
    <Expression
      className='box boxEval'
      state={ { strategy : EvaluationStrategy.NORMAL, SDE : true, macrotable : {}, collapseOldSteps : true, isRunning : false } as unknown as UntypedLambdaState }
      breakpoints={ [] }
      history={ buildHistory().slice(0, 2) }
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

  expect(container.querySelector('.box-initial-step .stepNumber')?.textContent).toMatch(/0 :/);
  expect(container.querySelectorAll('.box-history-scroll li').length).toBe(0);
  expect(container.querySelectorAll('.history-gap-indicator').length).toBe(0);
  expect(container.querySelector('.box-current-step .stepNumber')?.textContent).toMatch(/1 :/);
});

test('gap marks mount at both ends, hidden while history shows everything', () => {
  const { container } = renderExpression();

  // Marks float inside a positioning wrap over the scroll, so showing
  // them never reflows the box.
  expect(container.querySelector('.box-history-wrap .box-history-scroll')).not.toBeNull();

  const marks = container.querySelectorAll('.history-gap-indicator');
  expect(marks.length).toBe(2);
  expect(marks[0].classList.contains('history-gap-indicator--top')).toBe(true);
  expect(marks[1].classList.contains('history-gap-indicator--bottom')).toBe(true);
  marks.forEach((mark) => {
    expect(mark.classList.contains('visible')).toBe(false);
    expect((mark as HTMLElement).tabIndex).toBe(-1);
  });
});

function scrollerWithGeometry (container : HTMLElement) : HTMLElement {
  const scroller = container.querySelector('.box-history-scroll') as HTMLElement;
  Object.defineProperty(scroller, 'scrollHeight', { configurable : true, value : 1000 });
  Object.defineProperty(scroller, 'clientHeight', { configurable : true, value : 200 });
  return scroller;
}

test('scrolling away from either end reveals that end’s mark', () => {
  const { container } = renderExpression();
  const scroller = scrollerWithGeometry(container);

  scroller.scrollTop = 300;
  fireEvent.scroll(scroller);

  const marks = container.querySelectorAll('.history-gap-indicator');
  expect(marks[0].classList.contains('visible')).toBe(true);
  expect(marks[1].classList.contains('visible')).toBe(true);
  marks.forEach((mark) => expect((mark as HTMLElement).tabIndex).toBe(0));
  expect(scroller.classList.contains('mask-top')).toBe(true);
  expect(scroller.classList.contains('mask-bottom')).toBe(true);

  scroller.scrollTop = 0;
  fireEvent.scroll(scroller);

  expect(marks[0].classList.contains('visible')).toBe(false);
  expect(marks[1].classList.contains('visible')).toBe(true);
  expect(scroller.classList.contains('mask-top')).toBe(false);
  expect(scroller.classList.contains('mask-bottom')).toBe(true);
});

test('clicking the top mark jumps the history to its start', () => {
  const { container } = renderExpression();
  const scroller = scrollerWithGeometry(container);
  scroller.scrollTop = 300;
  fireEvent.scroll(scroller);

  const proto = window.HTMLElement.prototype as any;
  const originalScrollTo = proto.scrollTo;
  const spy = vi.fn();
  proto.scrollTo = spy;
  try {
    const topMark = container.querySelector('.history-gap-indicator--top') as HTMLElement;
    fireEvent.click(topMark);
    expect(spy).toHaveBeenCalledWith({ top : 0, behavior : 'smooth' });
  }
  finally {
    proto.scrollTo = originalScrollTo;
  }
});

test('history scroll is allowed to chain out to the notebook', () => {
  // The sticky ends are enforced in JS (see below); the CSS must not
  // trap the scroll or pushing past an end could never reach the page.
  const css = readFileSync('src/untyped-lambda-integration/styles/EvaluatorBox.css', 'utf8');
  const block = css.match(/\.box-history-scroll\s*\{[^}]*\}/)?.[0] ?? '';
  expect(block).not.toMatch(/overscroll-behavior\s*:\s*contain/);
});

test('hitting either end of the history sticks before chaining through', () => {
  const { container } = renderExpression();
  const scroller = scrollerWithGeometry(container);

  // Pinned at the top end: the first pushes are swallowed...
  scroller.scrollTop = 0;
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(false);
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(false);
  // ...then the scroll lets go and chains out to the notebook.
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(true);

  // Scrolling down through the middle re-arms the other end.
  scroller.scrollTop = 300;
  fireEvent.wheel(scroller, { deltaY : 100 });

  // Same at the bottom end.
  scroller.scrollTop = 800;
  expect(fireEvent.wheel(scroller, { deltaY : 100 })).toBe(false);
  expect(fireEvent.wheel(scroller, { deltaY : 100 })).toBe(false);
  expect(fireEvent.wheel(scroller, { deltaY : 100 })).toBe(true);
});

test('scrolling back inward re-arms the sticky end', () => {
  const { container } = renderExpression();
  const scroller = scrollerWithGeometry(container);

  scroller.scrollTop = 0;
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(false);
  fireEvent.wheel(scroller, { deltaY : 50 });
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(false);
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(false);
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(true);
});

test('history without overflow chains immediately', () => {
  const { container } = renderExpression();
  const scroller = container.querySelector('.box-history-scroll') as HTMLElement;
  Object.defineProperty(scroller, 'scrollHeight', { configurable : true, value : 200 });
  Object.defineProperty(scroller, 'clientHeight', { configurable : true, value : 200 });

  scroller.scrollTop = 0;
  expect(fireEvent.wheel(scroller, { deltaY : -100 })).toBe(true);
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
  expect(container.querySelectorAll('.history-gap-indicator').length).toBe(0);
  expect(container.querySelector('.box-current-step .stepNumber')?.textContent).toMatch(/0 :/);
});
