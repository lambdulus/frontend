import React from 'react';
import { test, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import App from './App';
import { createDefaultAppState, preferredTheme, saveTourState } from './Constants';
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
  expect(first.container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[0].title);
  first.unmount();

  // Snoozed mid-tour: no auto-open, and every step target resolves
  // in a fresh render so the tour cannot rot silently.
  saveTourState({ step : 2, done : true });
  const second = render(<App />);
  expect(second.container.querySelector('[role="dialog"]')).toBeNull();
  for (const step of TOUR_STEPS) {
    if (step.target !== undefined) {
      expect(second.container.querySelector(step.target), step.target).not.toBeNull();
    }
  }

  // The icon resumes where the tour left off.
  fireEvent.click(second.container.querySelector('[title="Guided tour"]') as HTMLElement);
  expect(second.container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[2].title);
  second.unmount();
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
