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

test('accents are lettered dots in one row', () => {
  // β Beta, λ Lambda, δ Delta, α Alpha: the dots themselves toggle
  // the native radios, captions below, popup closing on select.
  const onAccentChange = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } accent='emerald' onAccentChange={ onAccentChange } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const row = container.querySelector('.top-bar--accent-pick');
  expect(row).not.toBeNull();

  const radios = row?.querySelectorAll("input[type='radio']") ?? [];
  expect(radios.length).toBe(4);
  expect((radios[0] as HTMLInputElement).checked).toBe(true);

  const glyphs = row?.querySelectorAll('.top-bar--accent-glyph') ?? [];
  expect([...glyphs].map((g) => g.textContent)).toEqual([ 'β', 'λ', 'δ', 'α' ]);
  const captions = row?.querySelectorAll('.top-bar--accent-caption') ?? [];
  expect([...captions].map((c) => c.textContent)).toEqual([ 'Beta', 'Lambda', 'Delta', 'Alpha' ]);

  fireEvent.click(radios[2]);
  expect(onAccentChange).toHaveBeenCalledWith('indigo');

  const css = readFileSync('src/styles/TopBar.css', 'utf8');
  const dot = css.match(/\.top-bar--accent-dot\s*\{[^}]*\}/)?.[0] ?? '';
  expect(dot).toMatch(/width\s*:\s*40px/);
  expect(dot).toMatch(/border-radius\s*:\s*50%/);
  const swatch = css.match(/\.top-bar--theme-swatch--indigo\s*\{[^}]*\}/)?.[0] ?? '';
  expect(swatch).toMatch(/background-color\s*:\s*#6366f1/);
  const ring = css.match(/\.top-bar--accent-option input\[type='radio'\]:checked \+ \.top-bar--accent-choice \.top-bar--accent-dot\.top-bar--theme-swatch--indigo\s*\{[^}]*\}/)?.[0] ?? '';
  expect(ring).toMatch(/box-shadow\s*:/);
});

test('box style is picked by preview tiles acting as radios', () => {
  // Two miniature boxes side by side; the tiles themselves toggle the
  // native radios, and the panel stays open so the looks compare.
  const onBoxStyleChange = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } boxStyle='cards' onBoxStyleChange={ onBoxStyleChange } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const previews = container.querySelector('.top-bar--boxpreview');
  expect(previews).not.toBeNull();

  const radios = previews?.querySelectorAll("input[type='radio']") ?? [];
  expect(radios.length).toBe(2);
  expect((radios[0] as HTMLInputElement).checked).toBe(true);
  expect((radios[1] as HTMLInputElement).checked).toBe(false);
  const classicTile = container.querySelector('label[for="top-bar--boxstyle-classic"]');
  expect(classicTile?.querySelector('.top-bar--boxpreview-art--classic')).not.toBeNull();
  expect(classicTile?.querySelector('.top-bar--boxpreview-caption')?.textContent).toBe('Classic');

  fireEvent.click(radios[1]);
  expect(onBoxStyleChange).toHaveBeenCalledWith('classic');
  // Still open for the comparison: the panel did not close itself.
  expect(container.querySelector('.top-bar--boxpreview')).not.toBeNull();
});

test('box style section stands off from the accent section', () => {
  const css = readFileSync('src/styles/TopBar.css', 'utf8');
  const gap = css.match(/\.top-bar--settings-panel > \.top-bar--settings-title ~ \.top-bar--settings-title\s*\{[^}]*\}/)?.[0] ?? '';
  expect(gap).toMatch(/margin-top\s*:\s*16px/);
  // Same label-to-control rhythm as the accent buttons above it.
  const row = css.match(/\.top-bar--boxpreview\s*\{[^}]*\}/)?.[0] ?? '';
  expect(row).toMatch(/margin-top\s*:\s*8px/);
  // The miniatures abstract the two looks: a shadowed card, a rail line.
  const card = css.match(/\.top-bar--boxpreview-art--cards\s*\{[^}]*\}/)?.[0] ?? '';
  expect(card).toMatch(/border-radius\s*:\s*6px/);
  expect(card).toMatch(/box-shadow\s*:\s*var\(--shadow\)/);
  const rail = css.match(/\.top-bar--boxpreview-art--classic::before\s*\{[^}]*\}/)?.[0] ?? '';
  expect(rail).toMatch(/width\s*:\s*2px/);
  expect(rail).toMatch(/background-color\s*:\s*var\(--accent\)/);
  // The checked tile rings in accent.
  const picked = css.match(/\.top-bar--boxpreview-option input\[type='radio'\]:checked \+ \.top-bar--boxpreview-tile\s*\{[^}]*\}/)?.[0] ?? '';
  expect(picked).toMatch(/border-color\s*:\s*var\(--accent\)/);
});
