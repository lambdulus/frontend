import { readFileSync } from 'fs';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import TopBar from './TopBar';
import { NotebookState } from '../Types';
import { Theme } from '../contexts/Theme';

afterEach(() => cleanup());

function notebook (zenMode : boolean | undefined) : NotebookState {
  return {
    name : 'Test',
    locked : false,
    zenMode,
    boxList : [],
    activeBoxIndex : 0,
    focusedBoxIndex : undefined,
    menuOpen : false,
    settings : {},
    __key : 'nb',
  };
}

function baseProps (onZenModeChange : (zenMode : boolean) => void) {
  return {
    notebooks : [ notebook(false) ],
    activeNotebookIndex : 0,
    theme : Theme.Dark,
    accent : 'emerald' as const,
    settings : {},
    onAccentChange : () => void 0,
    onNotebookSelect : () => void 0,
    onNotebookAdd : () => void 0,
    onNotebookRemove : () => void 0,
    onImport : () => void 0,
    onClearNotebook : () => void 0,
    onResetWorkspace : () => void 0,
    onDarkModeChange : () => void 0,
    onSettingsChange : () => void 0,
    onZenModeChange,
  };
}

test('theme toggle carries its styling hook and warms in the dark', () => {
  const { container } = render(<TopBar { ...baseProps(() => void 0) } />);

  const toggle = container.querySelector('[title="Toggle the theme"]') as HTMLElement;
  expect(toggle.classList.contains('top-bar--theme-toggle')).toBe(true);

  const css = readFileSync('src/styles/TopBar.css', 'utf8');
  const warm = css.match(/#app\.dark \.top-bar--theme-toggle:hover\s*\{[^}]*\}/)?.[0] ?? '';
  expect(warm).toMatch(/color\s*:\s*var\(--warning\)/);
});

test('zen control is a real switch reflecting the mode', () => {
  const onZenModeChange = vi.fn();
  const { container, rerender } = render(<TopBar { ...baseProps(onZenModeChange) } />);

  const off = container.querySelector('[role="switch"]') as HTMLElement;
  expect(off).not.toBeNull();
  expect(off.getAttribute('aria-checked')).toBe('false');
  expect(off.classList.contains('top-bar--zen--on')).toBe(false);

  fireEvent.click(off);
  expect(onZenModeChange).toHaveBeenCalledWith(true);

  rerender(<TopBar { ...baseProps(onZenModeChange) } notebooks={ [ notebook(true) ] } />);
  const on = container.querySelector('[role="switch"]') as HTMLElement;
  expect(on.getAttribute('aria-checked')).toBe('true');
  expect(on.classList.contains('top-bar--zen--on')).toBe(true);

  fireEvent.click(on);
  expect(onZenModeChange).toHaveBeenCalledWith(false);
});
