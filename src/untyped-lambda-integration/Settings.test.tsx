import React from 'react';
import { readFileSync } from 'fs';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import Settings from './Settings';
import { BoxType } from '../Types';
import { EvaluationStrategy, UntypedLambdaSettings, SettingsEnabled } from './Types';

const baseSettings : UntypedLambdaSettings = {
  type : BoxType.UNTYPED_LAMBDA,
  SLI : true,
  expandStandalones : false,
  strategy : EvaluationStrategy.NORMAL,
  SDE : true,
  ETA : false,
  collapseOldSteps : true,
};

const enabler : SettingsEnabled = {
  SLI : true,
  expandStandalones : true,
  strategy : true,
};

afterEach(() => cleanup());

test('collapse toggle reflects the setting and reports turning it off', () => {
  const change = vi.fn();
  const { getByLabelText } = render(
    <Settings settings={ baseSettings } settingsEnabled={ enabler } change={ change } />
  );

  const checkbox = getByLabelText('Collapse Old Steps') as HTMLInputElement;
  expect(checkbox.checked).toBe(true);

  fireEvent.click(checkbox);
  expect(change).toHaveBeenCalledWith({ ...baseSettings, collapseOldSteps : false });
});

test('input ids stay stable across re-renders', () => {
  const change = vi.fn();
  const { getByLabelText, rerender } = render(
    <Settings settings={ baseSettings } settingsEnabled={ enabler } change={ change } />
  );

  const before = (getByLabelText('Collapse Old Steps') as HTMLInputElement).id;
  rerender(
    <Settings settings={ { ...baseSettings, SDE : false } } settingsEnabled={ enabler } change={ change } />
  );

  expect((getByLabelText('Collapse Old Steps') as HTMLInputElement).id).toBe(before);
});

test('collapse toggle renders unchecked when the setting is off', () => {
  const change = vi.fn();
  const { getByLabelText } = render(
    <Settings settings={ { ...baseSettings, collapseOldSteps : false } } settingsEnabled={ enabler } change={ change } />
  );

  const checkbox = getByLabelText('Collapse Old Steps') as HTMLInputElement;
  expect(checkbox.checked).toBe(false);
});

test('eta toggle reflects the setting and reports turning it on', () => {
  const change = vi.fn();
  const { getByLabelText } = render(
    <Settings settings={ baseSettings } settingsEnabled={ enabler } change={ change } />
  );

  const checkbox = getByLabelText('Eta Conversion') as HTMLInputElement;
  expect(checkbox.checked).toBe(false);

  fireEvent.click(checkbox);
  expect(change).toHaveBeenCalledWith({ ...baseSettings, ETA : true });
});

test('restart offer sits inline in the panel type scale', () => {
  // One row with the strategy radios: muted label beside an outlined
  // button, everything at the 0.9em label size, no filled accent.
  const css = readFileSync('src/untyped-lambda-integration/styles/Settings.css', 'utf8');
  const row = css.match(/\.untyped-lambda-settings-restart\s*\{[^}]*\}/)?.[0] ?? '';
  expect(row).not.toMatch(/flex-direction\s*:\s*column/);
  expect(row).toMatch(/align-items\s*:\s*center/);
  const label = css.match(/\.untyped-lambda-settings-restart-label\s*\{[^}]*\}/)?.[0] ?? '';
  expect(label).toMatch(/font-size\s*:\s*0\.9em/);
  const button = css.match(/\.untyped-lambda-settings-restart-button\s*\{[^}]*\}/)?.[0] ?? '';
  expect(button).toMatch(/font-size\s*:\s*0\.8em/);
  expect(button).toMatch(/border\s*:[^;]*var\(--accent\)/);
  expect(button).not.toMatch(/background-color\s*:\s*var\(--accent\)/);
});
