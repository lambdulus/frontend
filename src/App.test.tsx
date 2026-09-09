import { readFileSync } from 'fs';
import React from 'react';
import { test, expect, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from './App';

afterEach(() => cleanup());
import { createDefaultAppState, preferredTheme, saveTourState, loadTourState, updateAppStateToStorage } from './Constants';
import { createNewMarkdown } from './markdown-integration/AppTypes';
import { TOUR_STEPS } from './components/Tour';
import { defaultSettings, createNewUntypedLambdaExpression } from './untyped-lambda-integration/Constants';
import { UntypedLambdaType } from './untyped-lambda-integration/Types';
import { buildBoxShareURL } from './components/BoxTitleBar';
import { Theme } from './contexts/Theme';

test('renders the app shell (top-level smoke test)', () => {
  const { container } = render(<App />);
  // No screen gate anymore: narrow screens get the stripped mini mode.
  expect(container.querySelector('#bad-screen-message')).toBeNull();
  expect(container.querySelector('.top-bar')).not.toBeNull();
});

test('sub-375px screens get the stripped mini mode', () => {
  // One box, no top bar, no way to add boxes — the experiment owns
  // anything narrower than MINI_MODE_WIDTH.
  const original = window.matchMedia;
  window.matchMedia = (() => ({ matches : true })) as unknown as typeof window.matchMedia;
  try {
    window.localStorage.clear();
    const { container } = render(<App />);
    expect(container.querySelector('.mini-mode .mainSpace.zen')).not.toBeNull();
    expect(container.querySelector('.top-bar')).toBeNull();

    // First run down here: the walkme never opens, and the empty
    // notebook grows its one box with the editor open.
    expect(container.querySelector('.tour')).toBeNull();
    expect(container.querySelectorAll('.mini-mode .box-frame').length).toBe(1);

    // The add-box button stays mounted but stepped out by the mini CSS.
    const css = readFileSync('src/styles/MiniMode.css', 'utf8');
    expect(css).toMatch(/\.mini-mode \.zen-add\s*\{[^}]*display\s*:\s*none/);
    expect(css).toMatch(/\.mini-mode \.mainSpace\s*\{[^}]*padding-top\s*:\s*20px/);

    // No macro table down here: the whole dock steps out, and no
    // icon replaces it anywhere.
    expect(css).toMatch(/\.mini-mode \.macro-dock\s*\{[^}]*display\s*:\s*none/);
    expect(css).not.toMatch(/macros-toggle/);

    // Fluid smaller type, em-riding paddings, and Run-only: no
    // stepping, no exercise boxes.
    expect(css).toMatch(/\.mini-mode\s*\{[^}]*font-size\s*:\s*max\(10px, 3\.733vw\)/);
    expect(css).toMatch(/\.mini-mode \.boxContainer\s*\{[^}]*padding\s*:\s*1em 0\.8em 1\.2em/);
    expect(css).toMatch(/\.mini-mode \.mainSpace\.zen \.boxContainer\s*\{[^}]*height\s*:\s*calc\(100vh - 40px - 2\.2em - 2px\)/);
    expect(css).toMatch(/padding-bottom\s*:\s*20px/);
    expect(css).toMatch(/\.mini-mode \.debug-controls--step[\s\S]*?display\s*:\s*none/);
    expect(css).toMatch(/\.mini-mode \.open-as-exercise[\s\S]*?display\s*:\s*none/);

    // Three-line editor: the monaco wrapper section is pinned down,
    // hammer included since the height prop rides inline.
    expect(css).toMatch(/\.mini-mode \.editorContainer \.editor > div > section\s*\{[^}]*height\s*:\s*57px !important/);
  }
  finally {
    window.matchMedia = original;
  }
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
  expect(first.container.querySelector('.tour--title')?.textContent).toBe('Welcome to Lambdulus');
  first.unmount();

  // Snoozed mid-tour: no auto-open, and every step selector resolves
  // in a fresh render so the tour cannot rot silently.
  saveTourState({ step : 'macros', done : true });
  const second = render(<App />);
  expect(second.container.querySelector('[role="dialog"]')).toBeNull();
  for (const step of TOUR_STEPS) {
    if (step.needsBox === true || step.needsPanel === true) {
      continue;
    }
    for (const selector of [ step.target, step.advanceOn ]) {
      if (selector !== undefined) {
        expect(second.container.querySelector(selector), selector).not.toBeNull();
      }
    }
    // Tracked-box selectors resolve only against a live box (covered by
    // the conducted walk below); here they must at least exist as hooks.
    for (const selector of [ step.targetInTracked, step.advanceOnInTracked ]) {
      if (selector !== undefined) {
        expect(typeof selector, step.id).toBe('string');
      }
    }
  }

  // The icon resumes where the tour left off.
  fireEvent.click(second.container.querySelector('[title="Guided tour"]') as HTMLElement);
  expect(second.container.querySelector('.tour--title')?.textContent).toBe('Macros');
  second.unmount();
});

test('chauffeur next on the + step opens the real picker', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;

  fireEvent.click(nextBtn());
  expect(container.querySelector('.tour--title')?.textContent).toBe('Add a box');
  fireEvent.click(nextBtn());
  expect(container.querySelector('.tour--title')?.textContent).toBe('Pick a box type');
  // The chauffeur worked the clickable control, not its inert wrapper:
  // the real picker opens (a tick later — native dispatch flushes async).
  await waitFor(() => expect(container.querySelector('[title="Create new λ box"]')).not.toBeNull());
});

test('the tour conducts a lambda box from + to evaluated', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  // Welcome to the + step (empty notebook: the big + panel).
  fireEvent.click(nextBtn());
  expect(title()).toBe('Add a box');

  // The user clicks + themselves: picker opens, tour walks to box types.
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  expect(title()).toBe('Pick a box type');
  expect(container.querySelector('[title="Create new λ box"]')).not.toBeNull();

  // They pick λ: a real box appears, the tour watches it happen.
  fireEvent.click(container.querySelector('[title="Create new λ box"]') as Element);
  await waitFor(() => expect(title()).toBe('Write and evaluate'));
  expect(container.querySelectorAll('.box-frame').length).toBe(1);

  // Next does their typing and debugging; the evaluated box walks on,
  // and the ring sits on the Step button alone — never the whole box.
  fireEvent.click(nextBtn());
  await waitFor(() => expect(title()).toBe('Step through evaluation'));
  expect(container.querySelector('.box-history-wrap')).not.toBeNull();
  expect(container.querySelector('.debug-controls--step')).not.toBeNull();

  // The box map rides the right edge: lines jump, arrows page.
  fireEvent.click(nextBtn());
  expect(title()).toBe('The box map');
  expect(container.querySelector('.box-map')).not.toBeNull();

  // Settings get their own steps: the gear starts closed, Next opens it.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Box settings');
  expect(container.querySelector('.box-settings')).toBeNull();

  fireEvent.click(nextBtn());
  expect(title()).toBe('Single Letter Names');
  expect(container.querySelector('.box-settings')).not.toBeNull();
  expect(container.querySelector('.untyped-lambda-settings-SLI')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Simplified Evaluation');
  expect(container.querySelector('.untyped-lambda-settings-SDE')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Eta Conversion');
  expect(container.querySelector('.untyped-lambda-settings-ETA')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Collapse Old Steps');
  expect(container.querySelector('.untyped-lambda-settings-collapse')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Evaluation Strategies');
  expect(container.querySelector('.untyped-lambda-settings-strategies')).not.toBeNull();

  // Macros open themselves on arrival and close the settings behind us.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Macros');
  await waitFor(() => expect(container.querySelector('.macro-dock--open')).not.toBeNull());
  expect(container.querySelector('.box-settings')).toBeNull();

  // Share one box rides with the box cluster, before the top-bar globals —
  // and the demonstrated dock collapses on the way out, after its shut
  // bridge plays out.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Share one box');
  expect(container.querySelector('[title="Copy the link to this Expression."]')).not.toBeNull();
  await waitFor(() => expect(container.querySelector('.macro-dock--open')).toBeNull());

  // Zen mode, conducted both ways: Next flips the real switch through
  // state — and the demonstrated dock closes forgetfully with it, never
  // obstructing the clean box nor springing back afterwards.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Zen mode');
  fireEvent.click(nextBtn());
  expect(title()).toBe('Settle into zen');
  fireEvent.click(nextBtn());
  expect(title()).toBe('A clean slate');
  expect(container.querySelector('.mainSpace.zen')).not.toBeNull();
  // The demonstrated dock collapses with it — after its shut bridge
  // plays out — remembered but never obstructing the clean box.
  await waitFor(() => expect(container.querySelector('.macro-dock--open')).toBeNull());

  // Step 11 shows just the button: no panel yet.
  expect(container.querySelector('[title="Erase all notebooks except the Manual and start over with the defaults"]')).toBeNull();
  expect(container.querySelectorAll('.box-frame').length).toBe(1);

  // The exits walk one by one, settings-cluster style — the panel
  // opens on arrival, shown, never pressed.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Clear notebook');
  await waitFor(() => expect(container.querySelector('[title="Erase all notebooks except the Manual and start over with the defaults"]')).not.toBeNull());
  expect(container.querySelector('.top-bar--clear-btn:not(.btn-danger)')).not.toBeNull();
  fireEvent.click(nextBtn());
  expect(title()).toBe('Clean entire workspace');

  // Yours opens themes; the finale then walks take-with-you and meta.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Make it yours');
  await waitFor(() => expect(container.querySelector('.top-bar--accent-pick')).not.toBeNull());

  // Themes get their own walks too: accent dots, then box-style tiles.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Accent color');
  fireEvent.click(nextBtn());
  expect(title()).toBe('Box style');
  expect(container.querySelector('.top-bar--boxpreview')).not.toBeNull();

  // Export for persistent storage, import for sharing between people —
  // and the themes panel steps out on the way in.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Import and export');
  expect(container.querySelector('.top-bar--accent-pick')).toBeNull();
  expect(container.querySelector('[title="Download this Notebook"]')).not.toBeNull();

  // The bug icon reports to the GitHub repo.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Report a bug');
  expect(container.querySelector('[title="Submit a bug or a feature request"]')).not.toBeNull();

  // The walkme icon replays the tour — last step, Done finishes.
  fireEvent.click(nextBtn());
  expect(title()).toBe('Walk me again');
  expect(container.querySelector('[title="Guided tour"]')).not.toBeNull();

  // To the end: the box stays behind for them to keep, and the panels
  // step out with the tour instead of lingering open.
  const done = [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Done') as Element;
  fireEvent.click(done);
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(container.querySelector('.top-bar--settings-panel')).toBeNull();
  expect(container.querySelectorAll('.box-frame').length).toBe(1);
  expect(loadTourState()).toEqual({ step : 'welcome', done : true });

  // Leaving zen restores nothing: entering forgot the demonstrated dock,
  // so it stays shut on the way back out — and re-entering keeps it shut.
  const zenSwitch = container.querySelector('.top-bar--zen') as Element;
  fireEvent.click(zenSwitch);
  expect(container.querySelector('.mainSpace.zen')).toBeNull();
  expect(container.querySelector('.macro-dock--open')).toBeNull();
  fireEvent.click(zenSwitch);
  expect(container.querySelector('.mainSpace.zen')).not.toBeNull();
  await waitFor(() => expect(container.querySelector('.macro-dock--open')).toBeNull());
});

async function walkToMdDelete (container : HTMLElement) : Promise<() => Element> {
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  fireEvent.click(nextBtn());
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  expect(title()).toBe('Pick a box type');
  fireEvent.click(container.querySelector('[title="Create new MarkDown box"]') as Element);
  await waitFor(() => expect(title()).toBe('A Markdown box'));
  fireEvent.click(nextBtn());
  await waitFor(() => expect(title()).toBe('Delete a box'));

  return nextBtn;
}

test('deleting the markdown box on the delete step loops back at once', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  await walkToMdDelete(container);

  const frame = container.querySelector('.box-frame:has(.markDownBox)') as HTMLElement;
  expect(frame).not.toBeNull();
  fireEvent.click(frame.querySelector('[title="Delete this Box from the Notebook"]') as HTMLElement);

  // Trash asks first; confirming deletes and the watcher loops back.
  fireEvent.click(container.querySelector('.box-delete-confirm-delete') as HTMLElement);

  await waitFor(() => expect(container.querySelector('.tour--title')?.textContent).toBe('Add a box'));
  expect(container.querySelectorAll('.box-frame').length).toBe(0);
});

test('deleting early on the explainer loops back through next', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  fireEvent.click(nextBtn());
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  fireEvent.click(container.querySelector('[title="Create new MarkDown box"]') as Element);
  await waitFor(() => expect(title()).toBe('A Markdown box'));

  const frame = container.querySelector('.box-frame:has(.markDownBox)') as HTMLElement;
  fireEvent.click(frame.querySelector('[title="Delete this Box from the Notebook"]') as HTMLElement);
  fireEvent.click(container.querySelector('.box-delete-confirm-delete') as HTMLElement);
  fireEvent.click(nextBtn());

  await waitFor(() => expect(title()).toBe('Add a box'));
  expect(container.querySelectorAll('.box-frame').length).toBe(0);
});

test('the markdown detour loops back once its box is deleted', async () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const nextBtn = () => [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  const title = () => container.querySelector('.tour--title')?.textContent;

  fireEvent.click(nextBtn());
  fireEvent.click(container.querySelector('.create-box-plus') as Element);
  expect(title()).toBe('Pick a box type');

  // The detour: markdown explains itself, then teaches deletion.
  fireEvent.click(container.querySelector('[title="Create new MarkDown box"]') as Element);
  await waitFor(() => expect(title()).toBe('A Markdown box'));
  fireEvent.click(nextBtn());
  expect(title()).toBe('Delete a box');

  // Next deletes through state; the watcher loops back to adding, easter
  // egg intact: the user may circle here for as long as they like.
  fireEvent.click(nextBtn());
  await waitFor(() => expect(title()).toBe('Add a box'));
  expect(container.querySelectorAll('.box-frame').length).toBe(0);
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

test('creating a notebook parks the page at the top', () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  const originalScrollTo = window.scrollTo;
  const spy = vi.fn();
  window.scrollTo = spy;
  try {
    spy.mockClear();
    fireEvent.click(container.querySelector('[title="New notebook"]') as HTMLElement);
    // The old notebook's scroll would otherwise clamp into the short
    // new content, hiding the title one line up.
    expect(spy).toHaveBeenCalledWith({ top : 0, behavior : 'auto' });
    expect(container.querySelector('.top-bar--tab--active .top-bar--tab-name')?.textContent).toBe('Notebook 2');
  }
  finally {
    window.scrollTo = originalScrollTo;
  }
});

test('cleaning the workspace spares the protected Manual', () => {
  // The Manual keeps every box the user made; all other notebooks
  // start over with a fresh empty one.
  window.localStorage.clear();
  const fresh = createDefaultAppState();
  const kept = createNewMarkdown();
  kept.note = 'do not lose me';
  kept.editor.content = 'do not lose me';
  kept.isEditing = false;
  const manual = { ...fresh.notebooks[0], boxList : [ ...fresh.notebooks[0].boxList, kept ] };
  updateAppStateToStorage({ ...fresh, notebooks : [ manual, fresh.notebooks[1] ] });

  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
  try {
    const { container } = render(<App />);
    fireEvent.click(container.querySelector('[title="Clearing options"]') as HTMLElement);
    fireEvent.click(container.querySelector('[title="Erase all notebooks except the Manual and start over with the defaults"]') as HTMLElement);

    const stored = JSON.parse(window.localStorage.getItem('AppState') ?? '{}');
    expect(stored.notebooks.length).toBe(2);
    expect(stored.notebooks[0].locked).toBe(true);
    expect(stored.notebooks[0].boxList.length).toBe(manual.boxList.length);
    expect(stored.notebooks[0].boxList.some((box : { note?: unknown }) => box.note === 'do not lose me')).toBe(true);
    expect(stored.notebooks[1].boxList).toEqual([]);
    expect(stored.activeNotebookIndex).toBe(1);
  }
  finally {
    confirm.mockRestore();
  }
});

test('creating a notebook in zen mode stays in zen mode', () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  fireEvent.click(container.querySelector('.top-bar--zen') as Element);
  expect(container.querySelector('.mainSpace.zen')).not.toBeNull();
  fireEvent.click(container.querySelector('[title="New notebook"]') as HTMLElement);
  expect(container.querySelector('.top-bar--tab--active .top-bar--tab-name')?.textContent).toBe('Notebook 2');
  expect(container.querySelector('.mainSpace.zen')).not.toBeNull();
});

test('creating a notebook outside zen mode stays outside it', () => {
  window.localStorage.clear();
  const { container } = render(<App />);
  expect(container.querySelector('.mainSpace.zen')).toBeNull();
  fireEvent.click(container.querySelector('[title="New notebook"]') as HTMLElement);
  expect(container.querySelector('.top-bar--tab--active .top-bar--tab-name')?.textContent).toBe('Notebook 2');
  expect(container.querySelector('.mainSpace.zen')).toBeNull();
});

test('share links carry every local setting', () => {
  const fresh = createNewUntypedLambdaExpression(defaultSettings);
  const url = buildBoxShareURL({
    ...fresh,
    subtype : UntypedLambdaType.ORDINARY,
    editor : { ...fresh.editor, content : 'x' },
    ETA : true,
  });
  for (const param of [ 'SDE=true', 'SLI=true', 'ETA=true', 'expandStandalones=false', 'collapseOldSteps=true' ]) {
    expect(url, param).toContain(param);
  }
});

function sharedBoxSettings () : any {
  const stored = JSON.parse(window.localStorage.getItem('AppState') ?? '{}');
  return stored.notebooks.find((nb : any) => nb.name === 'Shared').boxList[0];
}

test('years-old links without the new params fall back to defaults', () => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/?type=UNTYPED_LAMBDA&source=x&macros={}&subtype=ORDINARY&strategy=Normal%20Evaluation&SDE=false&SLI=false');
  try {
    render(<App />);
    const box = sharedBoxSettings();
    // Old params still parse.
    expect(box.SDE).toBe(false);
    expect(box.SLI).toBe(false);
    expect(box.strategy).toBe('Normal Evaluation');
    // New params absent: defaults, not failure.
    expect(box.ETA).toBe(false);
    expect(box.expandStandalones).toBe(false);
    expect(box.collapseOldSteps).toBe(true);
  }
  finally {
    window.history.replaceState(null, '', '/');
  }
});

test('new links express every local setting', () => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/?type=UNTYPED_LAMBDA&source=x&macros={}&subtype=ORDINARY&strategy=Normal%20Evaluation&SDE=false&SLI=false&ETA=true&expandStandalones=true&collapseOldSteps=false');
  try {
    render(<App />);
    const box = sharedBoxSettings();
    expect(box.ETA).toBe(true);
    expect(box.expandStandalones).toBe(true);
    expect(box.collapseOldSteps).toBe(false);
  }
  finally {
    window.history.replaceState(null, '', '/');
  }
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
