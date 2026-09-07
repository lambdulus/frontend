import { test, expect } from 'vitest';
import { NormalEvaluator, tokenize, parse } from '@lambdulus/core';
import { createNewUntypedLambdaExpression, defaultSettings, strategyToEvaluator, findSimplifiedReduction, toMacroMap, MacroBeta } from './Constants';
import { EvaluationStrategy, UntypedLambdaSettings } from './Types';

test('constructor never leaves strategy/SLI/SDE undefined', () => {
  // Regression: PickBoxTypeModal feeds notebook settings straight in, and a
  // settings-less notebook yields undefined — the box must still come out
  // evaluatable, on module defaults.
  const box = createNewUntypedLambdaExpression(undefined as unknown as UntypedLambdaSettings);
  expect(box.strategy).toBe(defaultSettings.strategy);
  expect(box.SLI).toBe(defaultSettings.SLI);
  expect(box.SDE).toBe(defaultSettings.SDE);
  expect(box.strategy).toBe(EvaluationStrategy.NORMAL);
});

test('unknown strategy falls back to normal evaluation', () => {
  // A corrupt or future strategy value from old storage must not hand
  // undefined to `new` (which surfaces as a syntax error on healthy input).
  expect(strategyToEvaluator('bogus' as EvaluationStrategy)).toBe(NormalEvaluator);
  expect(strategyToEvaluator(undefined as unknown as EvaluationStrategy)).toBe(NormalEvaluator);
});

test('macro bodies keep multi-letter binders with SLI on', () => {
  // SLI must never split the binders inside a macro definition body:
  // `(λ fact n . …)` tokenized letter-wise becomes five binders and the
  // arity check later claims the macro is given too few arguments.
  const macromap = toMacroMap([ 'FACT := (λ fact n . ZERO n 1 (* n (fact (- n 1))))' ], true);
  expect(macromap['FACT']).toBe('(λ fact n . ZERO n 1 (* n (fact (- n 1))))');
});

test('Y FACT 3 steps without arity mismatch and reaches 6', () => {
  const content = 'FACT := (λ fact n . ZERO n 1 (* n (fact (- n 1)))); Y FACT 3';
  const definitions : Array<string> = content.split(';');
  const expression : string = definitions.pop() || '';
  const macromap = toMacroMap(definitions, true);
  let ast = parse(tokenize(expression, { lambdaLetters : [ 'λ' ], singleLetterVars : true, macromap }), macromap);

  let guard = 0;
  while (guard++ < 500) {
    const [ reduction, perform ] = findSimplifiedReduction(ast, EvaluationStrategy.NORMAL, macromap);
    if (reduction.constructor.name === 'None') {
      break;
    }
    if (reduction instanceof MacroBeta) {
      // Step 3 used to report arity 5 with 2 applications here.
      expect(reduction.applications.length).toBe(reduction.arity);
    }
    ast = perform(ast);
  }

  expect(ast.toString()).toBe('6');
});
