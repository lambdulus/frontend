import { test, expect } from 'vitest';
import { decodeNotebook } from './Constants';
import { CODE_NAME as UNTYPED_CODE_NAME } from './untyped-lambda-integration/Constants';
import { EvaluationStrategy } from './untyped-lambda-integration/Types';
import { NotebookState } from './Types';

function legacyNotebook (settings : unknown) : NotebookState {
  return { name : 'Old', boxList : [], settings } as unknown as NotebookState;
}

function untypedOf (notebook : NotebookState) : { strategy : unknown; SLI : unknown; SDE : unknown } {
  return notebook.settings[UNTYPED_CODE_NAME] as unknown as { strategy : unknown; SLI : unknown; SDE : unknown };
}

test('decode backfills settings for pre-settings notebooks', () => {
  // Regression: years-old stored notebooks carry no settings key, so every
  // box created from them got strategy/SLI/SDE undefined and no submitted
  // expression would ever evaluate ("Something is wrong...").
  const untyped = untypedOf(decodeNotebook(legacyNotebook(undefined)));
  expect(untyped.strategy).toBe(EvaluationStrategy.NORMAL);
  expect(untyped.SLI).toBe(true);
  expect(untyped.SDE).toBe(true);
});

test('decode keeps stored settings, filling only the gaps', () => {
  const untyped = untypedOf(decodeNotebook(legacyNotebook({
    [UNTYPED_CODE_NAME] : { strategy : EvaluationStrategy.APPLICATIVE },
  })));
  expect(untyped.strategy).toBe(EvaluationStrategy.APPLICATIVE);
  expect(untyped.SLI).toBe(true);
  expect(untyped.SDE).toBe(true);
});
