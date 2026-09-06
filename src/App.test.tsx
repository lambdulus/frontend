import React from 'react';
import { test, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';
import { createDefaultAppState, preferredTheme } from './Constants';
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
