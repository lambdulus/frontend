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
    boxStyle : 'cards' as const,
    settings : {},
    onAccentChange : () => void 0,
    onBoxStyleChange : () => void 0,
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
  const night = css.match(/#app\.light \.top-bar--theme-toggle:hover\s*\{[^}]*\}/)?.[0] ?? '';
  expect(night).toMatch(/color\s*:\s*var\(--text\)/);
  const disc = css.match(/#app\.light \.top-bar--theme-toggle:hover svg\s*\{[^}]*\}/)?.[0] ?? '';
  expect(disc).toMatch(/fill\s*:\s*currentColor/);
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

test('box style is a Cards/Classic radio in the theme popup', () => {
  const onBoxStyleChange = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } boxStyle='cards' onBoxStyleChange={ onBoxStyleChange } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const group = container.querySelector('[role="radiogroup"]');
  expect(group?.getAttribute('aria-label')).toBe('Box style');

  const radios = container.querySelectorAll('[role="radio"]');
  expect(radios.length).toBe(2);
  expect(radios[0].getAttribute('aria-checked')).toBe('true');
  expect(radios[1].getAttribute('aria-checked')).toBe('false');

  fireEvent.click(radios[1]);
  expect(onBoxStyleChange).toHaveBeenCalledWith('classic');
});
