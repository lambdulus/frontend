import { test, expect } from 'vitest';
import { NormalEvaluator } from '@lambdulus/core';
import { createNewUntypedLambdaExpression, defaultSettings, strategyToEvaluator } from './Constants';
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
