import React from 'react';
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
