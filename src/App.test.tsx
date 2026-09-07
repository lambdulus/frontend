import React from 'react';
import { test, expect, afterEach } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';

afterEach(() => cleanup());
import { createDefaultAppState, preferredTheme, saveTourState, loadTourState } from './Constants';
import { TOUR_STEPS } from './components/Tour';
import { defaultSettings, createNewUntypedLambdaExpression } from './untyped-lambda-integration/Constants';
import { Theme } from './contexts/Theme';

test('renders the app shell (top-level smoke test)', () => {
  const { getByText } = render(<App />);
  // #bad-screen-message is always rendered by App, independent of screen state
  const message = getByText(/Lambdulus only runs on screens at least 900 pixels wide\./i);
  expect(message).toBeInTheDocument();
});

function mockMatchMedia (matches : boolean) {
  return (() => ({ matches })) as unknown as typeof window.matchMedia;
}

test('first-run theme follows the system when the API exists', () => {
  const original = window.matchMedia;
  try {
    window.matchMedia = mockMatchMedia(true);
    expect(preferredTheme()).toBe(Theme.Light);
    window.matchMedia = mockMatchMedia(false);
    expect(preferredTheme()).toBe(Theme.Dark);
  }
  finally {
    window.matchMedia = original;
  }
});

test('first-run theme falls back to dark without the API', () => {
  const original = window.matchMedia;
  try {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    expect(preferredTheme()).toBe(Theme.Dark);
  }
  finally {
    window.matchMedia = original;
  }
});

test('emerald stays the default accent', () => {
  expect(createDefaultAppState().accent).toBe('emerald');
});

test('cards stay the default box style', () => {
  expect(createDefaultAppState().boxStyle).toBe('cards');
});

test('app shell carries the box style hook', () => {
  const { container } = render(<App />);
  expect(container.querySelector('#app')?.getAttribute('data-box-style')).toBe('cards');
});

test('new boxes start with settings closed', () => {
  expect(createNewUntypedLambdaExpression(defaultSettings).settingsOpen).toBe(false);
});

test('first load opens the guided tour, afterwards only the icon does', () => {
  window.localStorage.clear();
  const first = render(<App />);
  expect(first.container.querySelector('[role="dialog"]')).not.toBeNull();
  expect(first.container.querySelector('.tour--title')?.textContent).toBe('Welcome to Lambdulus');
  first.unmount();

  // Snoozed mid-tour: no auto-open, and every step selector resolves
  // in a fresh render so the tour cannot rot silently.
  saveTourState({ step : 'macros', done : true });
  const second = render(<App />);
  expect(second.container.querySelector('[role="dialog"]')).toBeNull();
  for (const step of TOUR_STEPS) {
    if (step.needsBox === true) {
      continue;
    }
    for (const selector of [ step.target, step.advanceOn ]) {
      if (selector !== undefined) {
        expect(second.container.querySelector(selector), selector).not.toBeNull();
      }
    }
    // Tracked-box selectors resolve only against a live box (covered by
    // the conducted walk below); here they must at least exist as hooks.
    for (const selector of [ step.targetInTracked, step.advanceOnInTracked ]) {
      if (selector !== undefined) {
        expect(typeof selector, step.id).toBe('string');
      }
    }
  }

  // The icon resumes where the tour left off.
  fireEvent.click(second.container.querySelector('[title="Guided tour"]') as HTMLElement);
  expect(second.container.querySelector('.tour--title')?.textContent).toBe('Macros');
  second.unmount();
});

test('chauffeur next on the + step opens the real picker', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;

  fireEvent.click(nextBtn());
  expect(container.querySelector('.tour--title')?.textContent).toBe('Add a box');
  fireEvent.click(nextBtn());
  expect(container.querySelector('.tour--title')?.textContent).toBe('Pick a box type');
  // The chauffeur worked the clickable control, not its inert wrapper:
  // the real picker opens (a tick later — native dispatch flushes async).
  await waitFor(() => expect(container.querySelector('[title="Create new λ box"]')).not.toBeNull());
});

test('the tour conducts a lambda box from + to evaluated', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  // Welcome to the + step (empty notebook: the big + panel).
  fireEvent.click(nextBtn());
  expect(title()).toBe('Add a box');

  // The user clicks + themselves: picker opens, tour walks to box types.
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  expect(title()).toBe('Pick a box type');
  expect(container.querySelector('[title="Create new λ box"]')).not.toBeNull();

  // They pick λ: a real box appears, the tour watches it happen.
  fireEvent.click(container.querySelector('[title="Create new λ box"]') as Element);
  await waitFor(() => expect(title()).toBe('Write and evaluate'));
  expect(container.querySelectorAll('.box-frame').length).toBe(1);

  // Next does their typing and debugging; the evaluated box walks on.
  fireEvent.click(nextBtn());
  await waitFor(() => expect(title()).toBe('Step through evaluation'));
  expect(container.querySelector('.box-history-wrap')).not.toBeNull();

  // The box map rides the right edge: lines jump, arrows page.
  fireEvent.click(nextBtn());
  expect(title()).toBe('The box map');
  expect(container.querySelector('.box-map')).not.toBeNull();

  // Settings get their own steps: the gear starts closed, Next opens it.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Box settings');
  expect(container.querySelector('.box-settings')).toBeNull();

  fireEvent.click(nextBtn());
  expect(title()).toBe('Single Letter Names');
  expect(container.querySelector('.box-settings')).not.toBeNull();
  expect(container.querySelector('.untyped-lambda-settings-SLI')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Simplified Evaluation');
  expect(container.querySelector('.untyped-lambda-settings-SDE')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Collapse Old Steps');
  expect(container.querySelector('.untyped-lambda-settings-collapse')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Evaluation Strategies');
  expect(container.querySelector('.untyped-lambda-settings-strategies')).not.toBeNull();

  // Macros open themselves on arrival and close the settings behind us.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Macros');
  await waitFor(() => expect(container.querySelector('.macro-dock--open')).not.toBeNull());
  expect(container.querySelector('.box-settings')).toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Make it yours');
  await waitFor(() => expect(container.querySelector('.top-bar--accent-pick')).not.toBeNull());

  // To the end: the box stays behind for them to keep.
  const done = [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Done') as Element;
  fireEvent.click(done);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(container.querySelectorAll('.box-frame').length).toBe(1);
  expect(loadTourState()).toEqual({ step : 'welcome', done : true });
});

async function walkToMdDelete (container : HTMLElement) : Promise<() => Element> {
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  fireEvent.click(nextBtn());
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  expect(title()).toBe('Pick a box type');
  fireEvent.click(container.querySelector('[title="Create new MarkDown box"]') as Element);
  await waitFor(() => expect(title()).toBe('A Markdown box'));
  fireEvent.click(nextBtn());
  await waitFor(() => expect(title()).toBe('Delete a box'));

  return nextBtn;
}

test('deleting the markdown box on the delete step loops back at once', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  await walkToMdDelete(container);

  const frame = container.querySelector('.box-frame:has(.markDownBox)') as HTMLElement;
  expect(frame).not.toBeNull();
  fireEvent.click(frame.querySelector('[title="Delete this Box from the Notebook"]') as HTMLElement);

  await waitFor(() => expect(container.querySelector('.tour--title')?.textContent).toBe('Add a box'));
  expect(container.querySelectorAll('.box-frame').length).toBe(0);
});

test('deleting early on the explainer loops back through next', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  fireEvent.click(nextBtn());
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  fireEvent.click(container.querySelector('[title="Create new MarkDown box"]') as Element);
  await waitFor(() => expect(title()).toBe('A Markdown box'));

  const frame = container.querySelector('.box-frame:has(.markDownBox)') as HTMLElement;
  fireEvent.click(frame.querySelector('[title="Delete this Box from the Notebook"]') as HTMLElement);
  fireEvent.click(nextBtn());

  await waitFor(() => expect(title()).toBe('Add a box'));
  expect(container.querySelectorAll('.box-frame').length).toBe(0);
});

test('the markdown detour loops back once its box is deleted', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  fireEvent.click(nextBtn());
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  expect(title()).toBe('Pick a box type');

  // The detour: markdown explains itself, then teaches deletion.
  fireEvent.click(container.querySelector('[title="Create new MarkDown box"]') as Element);
  await waitFor(() => expect(title()).toBe('A Markdown box'));
  fireEvent.click(nextBtn());
  expect(title()).toBe('Delete a box');

  // Next deletes through state; the watcher loops back to adding, easter
  // egg intact: the user may circle here for as long as they like.
  fireEvent.click(nextBtn());
  await waitFor(() => expect(title()).toBe('Add a box'));
  expect(container.querySelectorAll('.box-frame').length).toBe(0);
});

test('accent hover previews site-wide, click commits, popup stays open', () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const shellAccent = () => container.querySelector('#app')?.getAttribute('data-accent');
  const storedAccent = () => JSON.parse(window.localStorage.getItem('AppState') ?? '{}').accent;
  expect(shellAccent()).toBe('emerald');

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const options = container.querySelectorAll('.top-bar--accent-option');

  // Preview: the whole shell follows the hover, storage keeps the committed accent.
  fireEvent.mouseEnter(options[2]);
  expect(shellAccent()).toBe('indigo');
  expect(storedAccent()).toBe('emerald');

  // No click: leaving the row falls back to the committed accent.
  fireEvent.mouseLeave(container.querySelector('.top-bar--accent-pick') as HTMLElement);
  expect(shellAccent()).toBe('emerald');

  // Click commits, persists, and the popup stays open for comparing.
  const radios = container.querySelectorAll(".top-bar--accent-pick input[type='radio']");
  fireEvent.click(radios[3]);
  expect(shellAccent()).toBe('amber');
  expect(storedAccent()).toBe('amber');
  expect(container.querySelector('.top-bar--accent-pick')).not.toBeNull();
});

test('box style hover previews shell-wide, click commits, popup stays open', () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const shellStyle = () => container.querySelector('#app')?.getAttribute('data-box-style');
  const storedStyle = () => JSON.parse(window.localStorage.getItem('AppState') ?? '{}').boxStyle;
  expect(shellStyle()).toBe('cards');

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);

  // Preview: the whole shell follows the hover, storage keeps the committed style.
  fireEvent.mouseEnter(container.querySelectorAll('.top-bar--boxpreview-option')[1]);
  expect(shellStyle()).toBe('classic');
  expect(storedStyle()).toBe('cards');

  // No click: leaving the row falls back to the committed style.
  fireEvent.mouseLeave(container.querySelector('.top-bar--boxpreview') as HTMLElement);
  expect(shellStyle()).toBe('cards');

  // Click commits, persists, and the popup stays open for comparing.
  fireEvent.click(container.querySelectorAll(".top-bar--boxpreview input[type='radio']")[1]);
  expect(shellStyle()).toBe('classic');
  expect(storedStyle()).toBe('classic');
  expect(container.querySelector('.top-bar--boxpreview')).not.toBeNull();
});
