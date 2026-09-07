import { test, expect, beforeEach } from 'vitest';
import { decodeNotebook, loadTourState, saveTourState, defaultTourState } from './Constants';
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

beforeEach(() => window.localStorage.removeItem('LambdulusTour'));

test('tour storage starts empty, round-trips, rejects garbage', () => {
  expect(loadTourState()).toBeNull();
  expect(defaultTourState()).toEqual({ step : 0, done : false });

  saveTourState({ step : 3, done : false });
  expect(loadTourState()).toEqual({ step : 3, done : false });

  saveTourState({ step : 0, done : true });
  expect(loadTourState()).toEqual({ step : 0, done : true });

  window.localStorage.setItem('LambdulusTour', 'not-json{');
  expect(loadTourState()).toBeNull();

  window.localStorage.setItem('LambdulusTour', JSON.stringify({ step : 'two', done : 'yes' }));
  expect(loadTourState()).toBeNull();

  window.localStorage.setItem('LambdulusTour', JSON.stringify({ step : -1, done : false }));
  expect(loadTourState()).toBeNull();
});
