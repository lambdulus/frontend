import { test, expect } from 'vitest';
import { tokenize, parse, None, NormalEvaluator } from '@lambdulus/core';
import { createNewUntypedLambdaExpression, defaultSettings, findSimplifiedReduction, strategyToEvaluator, toMacroMap } from './Constants';
import { TreeComparator } from './TreeComparator';
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

test('/ 4 2 simplified run terminates with 2', () => {
  // Regression for frontend issue #60: division with simplified enabled froze
  // the page. The single-step macro perform ground the function part of the
  // Y-recursive `/` in isolation, which has no normal form without its
  // pending divisor, so the normalization loop never returned. It now caps
  // the grind and lets the outer evaluation continue with full context.
  const box = createNewUntypedLambdaExpression(defaultSettings);
  const macromap = toMacroMap([], box.SLI);
  const tok = (source : string) => tokenize(source, { lambdaLetters : [ 'λ' ], singleLetterVars : box.SLI, macromap });
  let ast = parse(tok('/ 4 2'), box.macrotable);
  const seen = new Set<string>();
  const CAP = 2000;
  for (let i = 0; i < CAP; i++) {
    const key = ast.toString();
    if (seen.has(key)) {
      expect.unreachable('simplified evaluation cycled without reaching normal form');
    }
    seen.add(key);
    const probe = ast.clone();
    const [ reduction, perform ] = findSimplifiedReduction(probe, box.strategy, box.macrotable);
    if (reduction instanceof None) {
      const expected = parse(tok('(λ a b . a (a b))'), box.macrotable);
      const equals = new TreeComparator([ast, expected], [box.macrotable, box.macrotable]).equals;
      expect(equals).toBe(true);
      return;
    }
    ast = perform(probe);
  }
  expect.unreachable('simplified evaluation did not terminate');
});
