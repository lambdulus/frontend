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
    confirmBoxDelete : true,
    settings : {},
    onAccentChange : () => void 0,
    onAccentPreview : () => void 0,
    onBoxStyleChange : () => void 0,
    onBoxStylePreview : () => void 0,
    onConfirmBoxDeleteChange : () => void 0,
    onNotebookSelect : () => void 0,
    onNotebookAdd : () => void 0,
    onNotebookRemove : () => void 0,
    onImport : () => void 0,
    onClearNotebook : () => void 0,
    onResetWorkspace : () => void 0,
    onDarkModeChange : () => void 0,
    onSettingsChange : () => void 0,
    onZenModeChange,
    onTourOpen : () => void 0,
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
  // β Beta, λ Lambda, η Eta, α Alpha: the dots themselves toggle
  // the native radios, captions below, popup staying open on select
  // like the box style picker below it.
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
  expect([...glyphs].map((g) => g.textContent)).toEqual([ 'β', 'λ', 'η', 'α' ]);
  const captions = row?.querySelectorAll('.top-bar--accent-caption') ?? [];
  expect([...captions].map((c) => c.textContent)).toEqual([ 'Beta', 'Lambda', 'Eta', 'Alpha' ]);

  fireEvent.click(radios[2]);
  expect(onAccentChange).toHaveBeenCalledWith('indigo');
  // Same as the box picker: the panel stays open to keep comparing.
  expect(container.querySelector('.top-bar--accent-pick')).not.toBeNull();

  const css = readFileSync('src/styles/TopBar.css', 'utf8');
  const dot = css.match(/\.top-bar--accent-dot\s*\{[^}]*\}/)?.[0] ?? '';
  expect(dot).toMatch(/width\s*:\s*40px/);
  expect(dot).toMatch(/border-radius\s*:\s*50%/);
  const swatch = css.match(/\.top-bar--theme-swatch--indigo\s*\{[^}]*\}/)?.[0] ?? '';
  expect(swatch).toMatch(/background-color\s*:\s*#6366f1/);
  const ring = css.match(/\.top-bar--accent-option input\[type='radio'\]:checked \+ \.top-bar--accent-choice \.top-bar--accent-dot\.top-bar--theme-swatch--indigo\s*\{[^}]*\}/)?.[0] ?? '';
  expect(ring).toMatch(/box-shadow\s*:/);
});

test('hovering an accent previews it, leaving the row falls back', () => {
  const onAccentPreview = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } accent='emerald' onAccentPreview={ onAccentPreview } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const options = container.querySelectorAll('.top-bar--accent-option');
  expect(options.length).toBe(4);

  fireEvent.mouseEnter(options[2]);
  expect(onAccentPreview).toHaveBeenLastCalledWith('indigo');

  fireEvent.mouseLeave(container.querySelector('.top-bar--accent-pick') as HTMLElement);
  expect(onAccentPreview).toHaveBeenLastCalledWith(null);
});

test('keyboard focus previews, tabbing out of the row falls back', () => {
  const onAccentPreview = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } accent='emerald' onAccentPreview={ onAccentPreview } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const row = container.querySelector('.top-bar--accent-pick') as HTMLElement;
  const radios = row.querySelectorAll("input[type='radio']");

  fireEvent.focus(radios[1]);
  expect(onAccentPreview).toHaveBeenLastCalledWith('blue');

  // Moving between options keeps the preview alive.
  fireEvent.blur(radios[1], { relatedTarget : radios[2] });
  expect(onAccentPreview).toHaveBeenLastCalledWith('blue');

  // Leaving the row entirely drops it.
  fireEvent.focus(radios[2]);
  fireEvent.blur(radios[2], { relatedTarget : document.body });
  expect(onAccentPreview).toHaveBeenLastCalledWith(null);
});

test('dismissing the popup drops any preview with it', () => {
  const onAccentPreview = vi.fn();
  const onBoxStylePreview = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } accent='emerald' onAccentPreview={ onAccentPreview } onBoxStylePreview={ onBoxStylePreview } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const radios = container.querySelectorAll(".top-bar--accent-pick input[type='radio']");
  fireEvent.focus(radios[3]);
  expect(onAccentPreview).toHaveBeenLastCalledWith('amber');
  const tiles = container.querySelectorAll(".top-bar--boxpreview input[type='radio']");
  fireEvent.focus(tiles[1]);
  expect(onBoxStylePreview).toHaveBeenLastCalledWith('classic');

  fireEvent.click(container.querySelector('.top-bar--backdrop') as HTMLElement);
  expect(onAccentPreview).toHaveBeenLastCalledWith(null);
  expect(onBoxStylePreview).toHaveBeenLastCalledWith(null);
  expect(container.querySelector('.top-bar--accent-pick')).toBeNull();
});

test('the global settings panel closes on outside click too', () => {
  const { container } = render(<TopBar { ...baseProps(() => void 0) } />);

  fireEvent.click(container.querySelector('[title="Notebook settings"]') as HTMLElement);
  expect(container.querySelector('.top-bar--settings-panel')).not.toBeNull();

  fireEvent.click(container.querySelector('.top-bar--backdrop') as HTMLElement);
  expect(container.querySelector('.top-bar--settings-panel')).toBeNull();
});

test('hovering a box tile previews it, leaving the row falls back', () => {
  const onBoxStylePreview = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } boxStyle='cards' onBoxStylePreview={ onBoxStylePreview } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const options = container.querySelectorAll('.top-bar--boxpreview-option');
  expect(options.length).toBe(2);

  fireEvent.mouseEnter(options[1]);
  expect(onBoxStylePreview).toHaveBeenLastCalledWith('classic');

  fireEvent.mouseLeave(container.querySelector('.top-bar--boxpreview') as HTMLElement);
  expect(onBoxStylePreview).toHaveBeenLastCalledWith(null);
});

test('keyboard focus previews the box tile, tabbing out falls back', () => {
  const onBoxStylePreview = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } boxStyle='cards' onBoxStylePreview={ onBoxStylePreview } />
  );

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  const row = container.querySelector('.top-bar--boxpreview') as HTMLElement;
  const radios = row.querySelectorAll("input[type='radio']");

  fireEvent.focus(radios[1]);
  expect(onBoxStylePreview).toHaveBeenLastCalledWith('classic');

  // Moving between tiles keeps the preview alive.
  fireEvent.blur(radios[1], { relatedTarget : radios[0] });
  expect(onBoxStylePreview).toHaveBeenLastCalledWith('classic');

  // Leaving the row entirely drops it.
  fireEvent.focus(radios[0]);
  fireEvent.blur(radios[0], { relatedTarget : document.body });
  expect(onBoxStylePreview).toHaveBeenLastCalledWith(null);
});

test('tour icon opens the tour and parks any open panel', () => {
  const onTourOpen = vi.fn();
  const { container } = render(<TopBar { ...baseProps(() => void 0) } onTourOpen={ onTourOpen } />);

  fireEvent.click(container.querySelector('[title="Accent theme"]') as HTMLElement);
  expect(container.querySelector('.top-bar--accent-pick')).not.toBeNull();

  fireEvent.click(container.querySelector('[title="Guided tour"]') as HTMLElement);
  expect(onTourOpen).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.top-bar--accent-pick')).toBeNull();
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

test('deletion toggle reflects the setting and reports unchecking', () => {
  const onConfirmBoxDeleteChange = vi.fn();
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } confirmBoxDelete={ true } onConfirmBoxDeleteChange={ onConfirmBoxDeleteChange } />
  );

  fireEvent.click(container.querySelector('[title="Notebook settings"]') as HTMLElement);
  const toggle = container.querySelector('#top-bar--confirm-delete') as HTMLElement;
  expect(toggle.getAttribute('aria-pressed')).toBe('true');
  expect(toggle.className).toMatch(/untyped-lambda-settings--toggle-on/);
  const rowLabel = container.querySelector('.top-bar--delete-confirm label');
  expect(rowLabel?.textContent).toBe('Confirm before deleting a box');
  expect(rowLabel?.className).toMatch(/untyped-lambda-settings-label/);

  fireEvent.click(toggle);
  expect(onConfirmBoxDeleteChange).toHaveBeenCalledWith(false);
});

test('deletion toggle renders off when asking is off', () => {
  const { container } = render(
    <TopBar { ...baseProps(() => void 0) } confirmBoxDelete={ false } onConfirmBoxDeleteChange={ () => void 0 } />
  );

  fireEvent.click(container.querySelector('[title="Notebook settings"]') as HTMLElement);
  const toggle = container.querySelector('#top-bar--confirm-delete') as HTMLElement;
  expect(toggle.getAttribute('aria-pressed')).toBe('false');
  expect(toggle.className).toMatch(/untyped-lambda-settings--toggle-off/);
});

test('narrow-screen menu folds the actions under a toggle', () => {
  const { container } = render(<TopBar { ...baseProps(() => void 0) } />);
  const toggle = container.querySelector('[aria-label="Menu"]') as HTMLElement;
  const actions = container.querySelector('.top-bar--actions') as HTMLElement;

  // Closed: the plain cluster, no dropdown, no backdrop.
  expect(actions.classList.contains('top-bar--actions--open')).toBe(false);
  expect(container.querySelector('.top-bar--backdrop')).toBeNull();

  // Open: the same node drops down, backdrop catches outside clicks.
  fireEvent.click(toggle);
  expect(actions.classList.contains('top-bar--actions--open')).toBe(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(container.querySelector('.top-bar--backdrop')).not.toBeNull();

  // Tabs stay in the bar either way.
  expect(container.querySelector('.top-bar--tabs')).not.toBeNull();

  // Taking an action closes the menu again...
  fireEvent.click(container.querySelector('[title="Toggle the theme"]') as HTMLElement);
  expect(actions.classList.contains('top-bar--actions--open')).toBe(false);

  // ...and so does the backdrop.
  fireEvent.click(toggle);
  fireEvent.click(container.querySelector('.top-bar--backdrop') as HTMLElement);
  expect(actions.classList.contains('top-bar--actions--open')).toBe(false);
});

test('reopening the menu dismisses an open panel', () => {
  // The menu and the panels share the corner: opening one must never
  // stack onto the other.
  const { container } = render(<TopBar { ...baseProps(() => void 0) } />);
  fireEvent.click(container.querySelector('[title="Notebook settings"]') as HTMLElement);
  expect(container.querySelector('.top-bar--settings-panel')).not.toBeNull();
  fireEvent.click(container.querySelector('[aria-label="Menu"]') as HTMLElement);
  expect(container.querySelector('.top-bar--actions--open')).not.toBeNull();
  expect(container.querySelector('.top-bar--settings-panel')).toBeNull();
});

test('menu rows name their icons', () => {
  // Nine rows, each carrying a label the open menu shows.
  const { container } = render(<TopBar { ...baseProps(() => void 0) } />);
  const rows = container.querySelectorAll('.top-bar--actions .top-bar--action, .top-bar--actions .top-bar--zen');
  expect(rows.length).toBe(9);
  rows.forEach((row) => {
    expect(row.querySelector('.top-bar--action-label')?.textContent).toMatch(/\S/);
  });

  // Hidden in the bar, shown in the open menu.
  const css = readFileSync('src/styles/TopBar.css', 'utf8');
  const label = css.match(/\.top-bar--action-label\s*\{[^}]*\}/)?.[0] ?? '';
  expect(label).toMatch(/display\s*:\s*none/);
  const media = css.slice(css.search(/@media[^{]*max-width\s*:\s*700px/));
  expect(media).toMatch(/\.top-bar--actions--open \.top-bar--action-label\s*\{[^}]*display\s*:\s*inline/);
});

test('below 700px the actions fold under the toggle', () => {
  // The cluster hides, the hamburger shows and morphs to an X, and
  // the open node drops down — while the icons keep their size.
  const css = readFileSync('src/styles/TopBar.css', 'utf8');
  const media = css.slice(css.search(/@media[^{]*max-width\s*:\s*700px/));
  expect(media).toMatch(/\.top-bar--menu-toggle\s*\{[^}]*display\s*:\s*inline-flex/);
  expect(media).toMatch(/\.top-bar--actions\s*\{[^}]*display\s*:\s*none/);
  expect(media).toMatch(/\.top-bar--actions--open\s*\{[^}]*position\s*:\s*absolute/);
  expect(media).toMatch(/\.top-bar--actions--open \.top-bar--action[\s\S]*?min-height\s*:\s*40px/);
  expect(css).toMatch(/\.top-bar--menu-toggle--open \.top-bar--menu-bar:nth-child\(1\)\s*\{[^}]*transform\s*:\s*rotate\(45deg\)/);
});
