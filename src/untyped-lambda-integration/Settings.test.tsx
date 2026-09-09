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

test('restart offer stands alone with breathing room', () => {
  // One wide outlined button on its own right-aligned row below the
  // strategies: headroom above, air from the panel edge, no fill.
  const css = readFileSync('src/untyped-lambda-integration/styles/Settings.css', 'utf8');
  const row = css.match(/\.untyped-lambda-settings-restart-row\s*\{[^}]*\}/)?.[0] ?? '';
  expect(row).toMatch(/justify-content\s*:\s*flex-end/);
  expect(row).toMatch(/margin\s*:\s*40px 8px 0 0/);
  const button = css.match(/\.untyped-lambda-settings-restart-button\s*\{[^}]*\}/)?.[0] ?? '';
  expect(button).toMatch(/font-size\s*:\s*0\.9em/);
  expect(button).toMatch(/border\s*:[^;]*var\(--accent\)/);
  expect(button).not.toMatch(/background-color\s*:\s*var\(--accent\)/);
});

test('switch toggles have track, thumb, and on paint', () => {
  // The button toggles (Simplified, global delete confirmation) share
  // these classes; without paint they render as bare browser buttons.
  // Geometry matches the painted checkbox switches (34x20 track).
  const css = readFileSync('src/untyped-lambda-integration/styles/Settings.css', 'utf8');
  const track = css.match(/\.untyped-lambda-settings--toggle\s*\{[^}]*\}/)?.[0] ?? '';
  expect(track).toMatch(/width\s*:\s*34px/);
  expect(track).toMatch(/height\s*:\s*20px/);
  expect(track).toMatch(/border-radius\s*:\s*999px/);
  const on = css.match(/\.untyped-lambda-settings--toggle-on\s*\{[^}]*\}/)?.[0] ?? '';
  expect(on).toMatch(/background-color\s*:\s*var\(--accent\)/);
  const thumb = css.match(/\.untyped-lambda-settings--toggle-thumb\s*\{[^}]*\}/)?.[0] ?? '';
  expect(thumb).toMatch(/border-radius\s*:\s*50%/);
  expect(thumb).toMatch(/background-color\s*:\s*var\(--muted\)/);
});
