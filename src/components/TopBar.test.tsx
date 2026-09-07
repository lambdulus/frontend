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

test('box style is a Cards/Classic segmented radio in the theme popup', () => {
  // Native radios like the evaluation strategy control, labels wired
  // by id; the panel stays open so the two looks compare in place.
  const onBoxStyleChange = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } boxStyle='cards' onBoxStyleChange={ onBoxStyleChange } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const seg = container.querySelector('.top-bar--boxstyle-seg');
  expect(seg).not.toBeNull();

  const radios = seg?.querySelectorAll("input[type='radio']") ?? [];
  expect(radios.length).toBe(2);
  expect((radios[0] as HTMLInputElement).checked).toBe(true);
  expect((radios[1] as HTMLInputElement).checked).toBe(false);
  expect(container.querySelector('label[for="top-bar--boxstyle-classic"]')?.textContent).toBe('Classic');

  fireEvent.click(radios[1]);
  expect(onBoxStyleChange).toHaveBeenCalledWith('classic');
  // Still open for the comparison: the panel did not close itself.
  expect(container.querySelector('.top-bar--boxstyle-seg')).not.toBeNull();
});

test('box style section stands off from the accent section', () => {
  const css = readFileSync('src/styles/TopBar.css', 'utf8');
  const gap = css.match(/\.top-bar--settings-panel > \.top-bar--settings-title ~ \.top-bar--settings-title\s*\{[^}]*\}/)?.[0] ?? '';
  expect(gap).toMatch(/margin-top\s*:\s*16px/);
  const seg = css.match(/\.top-bar--boxstyle-radio-wrapper input\[type='radio'\]:checked \+ \.top-bar--boxstyle-label\s*\{[^}]*\}/)?.[0] ?? '';
  expect(seg).toMatch(/background-color\s*:\s*var\(--accent\)/);
  // Same label-to-control rhythm as the accent buttons above it.
  const pill = css.match(/\.top-bar--boxstyle-seg\s*\{[^}]*\}/)?.[0] ?? '';
  expect(pill).toMatch(/margin-top\s*:\s*8px/);
});
