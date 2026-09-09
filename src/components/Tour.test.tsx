import { readFileSync } from 'fs';
import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import Tour, { TOUR_STEPS, BACK, NEXT_MAIN } from './Tour';
import { loadTourState } from '../Constants';

afterEach(() => cleanup());
beforeEach(() => window.localStorage.removeItem('LambdulusTour'));

interface TourCallbacks {
  onClose : () => void
  onAddLambdaBox : () => string | null
  onFillBoxEditor : (boxKey : string, content : string) => void
  onSetBoxSettings : (boxKey : string, open : boolean) => void
  onShowBoxMacros : (boxKey : string) => void
  onHideBoxMacros : (boxKey : string) => void
  onDeleteBox : (boxKey : string) => void
  onSetZenMode : (zenMode : boolean) => void
}

function props (over : Partial<{ initialStep : string } & TourCallbacks> = {}) {
  return {
    initialStep : 'welcome',
    onClose : () => void 0,
    onAddLambdaBox : () => null,
    onFillBoxEditor : () => void 0,
    onSetBoxSettings : () => void 0,
    onShowBoxMacros : () => void 0,
    onHideBoxMacros : () => void 0,
    onDeleteBox : () => void 0,
    onSetZenMode : () => void 0,
    ...over,
  };
}

function titleOf (container : HTMLElement) : string | null | undefined {
  return container.querySelector('.tour--title')?.textContent;
}

function nextBtn (container : HTMLElement) : Element {
  return [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
}

function plantFrame (container : HTMLElement, boxClass : string, key : string) : Element {
  const frame = document.createElement('div');
  frame.className = 'box-frame';
  frame.setAttribute('data-box-key', key);
  const inner = document.createElement('div');
  inner.className = boxClass;
  frame.appendChild(inner);
  container.appendChild(frame);

  return frame;
}

test('tour walks the main path, persisting each step id', () => {
  const onClose = vi.fn();
  const { container } = render(<Tour { ...props({ onClose }) } />);

  expect(titleOf(container)).toBe('Welcome to Lambdulus');

  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('Add a box');
  expect(loadTourState()).toEqual({ step : 'add', done : false });
  expect(onClose).not.toHaveBeenCalled();
});

test('back follows the branch map', () => {
  const { container } = render(<Tour { ...props({ initialStep : 'macros' }) } />);
  const back = [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Back') as Element;
  fireEvent.click(back);
  expect(titleOf(container)).toBe('Evaluation Strategies');
});

test('unknown initial step lands on welcome', () => {
  const { container } = render(<Tour { ...props({ initialStep : 'bogus' }) } />);
  expect(titleOf(container)).toBe('Welcome to Lambdulus');
});

test('a type step without its box loops back to adding', async () => {
  // Reloads forget the tracked element by design: never touch a stranger.
  const { container } = render(<Tour { ...props({ initialStep : 'type' }) } />);
  await waitFor(() => expect(titleOf(container)).toBe('Add a box'));
  expect(loadTourState()).toEqual({ step : 'add', done : false });
});

test('skip snoozes with the id, done restarts from welcome', () => {
  const onClose = vi.fn();
  const { container, unmount } = render(<Tour { ...props({ initialStep : 'macros', onClose }) } />);
  const skip = [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Skip') as Element;
  fireEvent.click(skip);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 'macros', done : true });
  unmount();

  const onClose2 = vi.fn();
  const second = render(<Tour { ...props({ initialStep : 'recap', onClose : onClose2 }) } />);
  const done = [...second.container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Done') as Element;
  fireEvent.click(done);
  expect(onClose2).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 'welcome', done : true });
});

test('the tour never dims: no step renders a backdrop', () => {
  for (const step of TOUR_STEPS) {
    const { container, unmount } = render(<Tour { ...props({ initialStep : step.id }) } />);
    expect(container.querySelector('.tour--backdrop'), step.id).toBeNull();
    unmount();
  }
});

test('the tour tops the fixed top bar, whose backdrop ate DONE', () => {
  // The top bar paints at 888 with a viewport-wide backdrop per panel;
  // below it the backdrop swallows tour clicks to close itself instead.
  const css = readFileSync('src/styles/Tour.css', 'utf8');
  const root = css.match(/\.tour\s*\{[^}]*\}/)?.[0] ?? '';
  expect(root).toMatch(/z-index\s*:\s*1000/);
});

test('every step leaves the app clickable', () => {
  for (const step of TOUR_STEPS) {
    const { container, unmount } = render(<Tour { ...props({ initialStep : step.id }) } />);
    expect(container.querySelector('.tour')?.classList.contains('tour--live'), step.id).toBe(false);
    expect(container.querySelector('.tour > .tour--card'), step.id).not.toBeNull();
    unmount();
  }
});

test('operating the + control advances just like next', () => {
  const onPlus = vi.fn();
  const { container } = render(
    <div>
      <div className='add_box_after' onMouseDown={ onPlus } />
      <Tour { ...props({ initialStep : 'add' }) } />
    </div>
  );

  fireEvent.mouseDown(container.querySelector('.add_box_after') as Element);
  expect(onPlus).toHaveBeenCalledTimes(1);
  expect(titleOf(container)).toBe('Pick a box type');
  expect(loadTourState()).toEqual({ step : 'pick', done : false });
});

test('next on the + step works the control, advancing exactly once', () => {
  const onPlus = vi.fn();
  const { container } = render(
    <div>
      <div className='add_box_after' onMouseDown={ onPlus } />
      <Tour { ...props({ initialStep : 'add' }) } />
    </div>
  );

  fireEvent.click(nextBtn(container));
  // Chauffeur mode: the control got its mousedown, the flagged events did
  // not re-advance, and we walked on exactly once.
  expect(onPlus).toHaveBeenCalledTimes(1);
  expect(titleOf(container)).toBe('Pick a box type');
  expect(loadTourState()).toEqual({ step : 'pick', done : false });
});

test('a new lambda box routes pick to the typing step', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  expect(titleOf(container)).toBe('Pick a box type');

  plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  await waitFor(() => expect(titleOf(container)).toBe('Write and evaluate'));
  expect(loadTourState()).toEqual({ step : 'type', done : false });
});

test('a new markdown box routes pick to the detour', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);

  plantFrame(container, 'markDownBox', 'k-md');
  await waitFor(() => expect(titleOf(container)).toBe('A Markdown box'));
  expect(loadTourState()).toEqual({ step : 'md-explain', done : false });
});

test('an evaluated box advances typing to stepping', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  const frame = plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  await waitFor(() => expect(titleOf(container)).toBe('Write and evaluate'));

  const evaluated = document.createElement('div');
  evaluated.className = 'box-history-wrap';
  frame.appendChild(evaluated);
  await waitFor(() => expect(titleOf(container)).toBe('Step through evaluation'));
  expect(loadTourState()).toEqual({ step : 'stepping', done : false });
});

test('a deleted box loops back to adding', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  const frame = plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  await waitFor(() => expect(titleOf(container)).toBe('Write and evaluate'));

  frame.remove();
  await waitFor(() => expect(titleOf(container)).toBe('Add a box'));
  expect(loadTourState()).toEqual({ step : 'add', done : false });
});

test('the markdown detour loops back once the box is gone', async () => {
  const onDeleteBox = vi.fn();
  const { container } = render(<Tour { ...props({ initialStep : 'pick', onDeleteBox }) } />);
  const frame = plantFrame(container, 'markDownBox', 'k-md');
  await waitFor(() => expect(titleOf(container)).toBe('A Markdown box'));

  // Through the explainer to the delete step, then chauffeur the deletion.
  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('Delete a box');
  fireEvent.click(nextBtn(container));
  expect(onDeleteBox).toHaveBeenCalledWith('k-md');

  // The watcher sees the real removal and loops back to adding.
  frame.remove();
  await waitFor(() => expect(titleOf(container)).toBe('Add a box'));
});

test('the delete step rings the trash button, not the whole box', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  const frame = plantFrame(container, 'markDownBox', 'k-md');
  const trash = document.createElement('div');
  trash.setAttribute('title', 'Delete this Box from the Notebook');
  trash.getBoundingClientRect = () => ({ x : 20, y : 10, top : 10, left : 20, right : 36, bottom : 26, width : 16, height : 16, toJSON : () => ({}) }) as DOMRect;
  frame.appendChild(trash);
  await waitFor(() => expect(titleOf(container)).toBe('A Markdown box'));

  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('Delete a box');

  // The ring seats on the 16px trash button with a 6px margin, not the frame.
  const ring = container.querySelector('.tour--ring') as HTMLElement;
  expect(ring).not.toBeNull();
  expect(ring.style.top).toBe('4px');
  expect(ring.style.left).toBe('14px');
  expect(ring.style.width).toBe('28px');
});

test('pick next prefers the open picker, falling back to state', () => {
  const onPick = vi.fn();
  const onAddLambdaBox = vi.fn(() => 'k-fallback');
  const { container } = render(
    <div>
      <div title='Create new λ box' onClick={ onPick } />
      <Tour { ...props({ initialStep : 'pick', onAddLambdaBox }) } />
    </div>
  );

  fireEvent.click(nextBtn(container));
  expect(onPick).toHaveBeenCalledTimes(1);
  expect(onAddLambdaBox).not.toHaveBeenCalled();
  // No box appeared, so the tour correctly stays put.
  expect(titleOf(container)).toBe('Pick a box type');
});

test('pick next without a modal creates the box through state', () => {
  const onAddLambdaBox = vi.fn(() => 'k-fallback');
  const { container } = render(<Tour { ...props({ initialStep : 'pick', onAddLambdaBox }) } />);

  fireEvent.click(nextBtn(container));
  expect(onAddLambdaBox).toHaveBeenCalledTimes(1);
});

test('type next fills the editor and submits for them', () => {
  const onFillBoxEditor = vi.fn();
  const { container } = render(<Tour { ...props({ initialStep : 'pick', onFillBoxEditor }) } />);
  const frame = plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  const debug = document.createElement('button');
  debug.className = 'open-as-debug';
  const submitted : Array<string> = [];
  debug.addEventListener('click', () => submitted.push('debug'));
  frame.appendChild(debug);

  return waitFor(() => expect(titleOf(container)).toBe('Write and evaluate')).then(() => {
    fireEvent.click(nextBtn(container));
    expect(onFillBoxEditor).toHaveBeenCalledWith('k-lambda', '(λ x . x y) a');
    expect(submitted).toEqual([ 'debug' ]);
  });
});

test('the tour card rides low instead of covering centered dialogs', () => {
  const css = readFileSync('src/styles/Tour.css', 'utf8');
  const card = css.match(/\.tour--card\s*\{[^}]*\}/)?.[0] ?? '';
  expect(card).toMatch(/bottom\s*:\s*24px/);
  expect(card).not.toMatch(/top\s*:\s*50%/);
});

test('the tour ids stay addressable', () => {
  expect(TOUR_STEPS.map((s) => s.id)).toEqual([
    'welcome', 'add', 'pick', 'type', 'stepping', 'boxmap',
    'settings', 'set-sli', 'set-sde', 'set-eta', 'set-collapse', 'set-strategy',
    'macros', 'share', 'zen', 'zen-dwell', 'cleaning', 'clean-notebook', 'clean-workspace',
    'yours', 'theme-accent', 'theme-style', 'transfer', 'report', 'recap',
    'md-explain', 'md-delete',
  ]);
});

test('every step is reachable by Next and Back through the settings walk', () => {
  // The walk does not follow array order, so an added step must also be
  // linked into both chains or Next sails right past it.
  expect(NEXT_MAIN['set-sde']).toBe('set-eta');
  expect(NEXT_MAIN['set-eta']).toBe('set-collapse');
  expect(BACK['set-eta']).toBe('set-sde');
  expect(BACK['set-collapse']).toBe('set-eta');
});

test('zen next enables zen mode through state and dwells before the finale', () => {
  const onSetZenMode = vi.fn();
  const { container } = render(<Tour { ...props({ initialStep : 'zen', onSetZenMode }) } />);
  expect(titleOf(container)).toBe('Zen mode');

  fireEvent.click(nextBtn(container));
  expect(onSetZenMode).toHaveBeenCalledWith(true);
  expect(titleOf(container)).toBe('Settle into zen');

  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('A clean slate');
});

test('the zen switch click walks on like next', () => {
  const { container } = render(
    <div>
      <button className='top-bar--zen' />
      <Tour { ...props({ initialStep : 'zen' }) } />
    </div>
  );

  fireEvent.click(container.querySelector('.top-bar--zen') as Element);
  expect(titleOf(container)).toBe('Settle into zen');
});

test('zen arrival steps open panels out of the way', () => {
  const onBackdrop = vi.fn();
  const { unmount } = render(
    <div>
      <div className='top-bar--backdrop' onClick={ onBackdrop } />
      <Tour { ...props({ initialStep : 'zen' }) } />
    </div>
  );
  expect(onBackdrop).toHaveBeenCalledTimes(1);
  unmount();
});

test('cleaning arrival shows the button without opening', () => {
  // Step 11 shows the eraser; only the exit sub-steps open the panel.
  const onEraser = vi.fn();
  const { container, unmount } = render(
    <div>
      <button title='Clearing options' onClick={ onEraser } />
      <Tour { ...props({ initialStep : 'cleaning' }) } />
    </div>
  );
  expect(onEraser).not.toHaveBeenCalled();
  expect(titleOf(container)).toBe('A clean slate');
  unmount();
});

test('cleaning arrival closes an open clearing panel', () => {
  // Backing in from an exit step: the button reads alone again.
  const onEraser = vi.fn();
  const onBackdrop = vi.fn();
  const { unmount } = render(
    <div>
      <button title='Clearing options' onClick={ onEraser } />
      <div className='top-bar--backdrop' onClick={ onBackdrop } />
      <button title='Erase all notebooks except the Manual and start over with the defaults' />
      <Tour { ...props({ initialStep : 'cleaning' }) } />
    </div>
  );
  expect(onEraser).not.toHaveBeenCalled();
  expect(onBackdrop).toHaveBeenCalledTimes(1);
  unmount();
});

test('exit-step arrival opens the clearing options but presses nothing', () => {
  const onEraser = vi.fn();
  const { container, unmount } = render(
    <div>
      <button title='Clearing options' onClick={ onEraser } />
      <Tour { ...props({ initialStep : 'clean-notebook' }) } />
    </div>
  );
  // Shown, not done: the panel opens, and the step carries no clear
  // callback to fire through.
  expect(onEraser).toHaveBeenCalledTimes(1);
  expect(titleOf(container)).toBe('Clear notebook');
  unmount();
});

test('exit-step arrival leaves an open clearing panel alone', () => {
  const onEraser = vi.fn();
  const { unmount } = render(
    <div>
      <button title='Clearing options' onClick={ onEraser } />
      <button title='Erase all notebooks except the Manual and start over with the defaults' />
      <Tour { ...props({ initialStep : 'clean-workspace' }) } />
    </div>
  );
  expect(onEraser).not.toHaveBeenCalled();
  unmount();
});

test('deleting early on the explainer loops back at once', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  const frame = plantFrame(container, 'markDownBox', 'k-md');
  await waitFor(() => expect(titleOf(container)).toBe('A Markdown box'));

  frame.remove();
  await waitFor(() => expect(titleOf(container)).toBe('Add a box'));
  expect(loadTourState()).toEqual({ step : 'add', done : false });
});

test('settings next opens the panel through state and walks each switch', async () => {
  const onSetBoxSettings = vi.fn();
  const onShowBoxMacros = vi.fn();
  const { container } = render(<Tour { ...props({ initialStep : 'pick', onSetBoxSettings, onShowBoxMacros }) } />);
  plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  await waitFor(() => expect(titleOf(container)).toBe('Write and evaluate'));

  const evaluated = document.createElement('div');
  evaluated.className = 'box-history-wrap';
  container.querySelector('.box-frame')?.appendChild(evaluated);
  await waitFor(() => expect(titleOf(container)).toBe('Step through evaluation'));

  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('The box map');

  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('Box settings');

  // Explicit value through state, never the render-closure toggle.
  fireEvent.click(nextBtn(container));
  expect(onSetBoxSettings).toHaveBeenCalledWith('k-lambda', true);
  expect(titleOf(container)).toBe('Single Letter Names');

  for (const title of [ 'Simplified Evaluation', 'Eta Conversion', 'Collapse Old Steps', 'Evaluation Strategies' ]) {
    fireEvent.click(nextBtn(container));
    expect(titleOf(container)).toBe(title);
  }

  // Macros arrival hands the panels over atomically, never toggling.
  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('Macros');
  expect(onShowBoxMacros).toHaveBeenCalledWith('k-lambda');
});

test('dictated expressions render as delimited code', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  await waitFor(() => expect(titleOf(container)).toBe('Write and evaluate'));

  const code = container.querySelector('.tour--code');
  expect(code?.textContent).toBe('(\\ x . x y) a');
});

test('starting or resuming seats the step subject below the top bar', () => {
  // A scrolled page (or boxes above the tour's own) must not leave the
  // card pointing off-screen: init seats the step's own target, else the
  // first box frame, below the fixed bar — the notebook's own 60px seat.
  // (jsdom has no layout, so the subjects below carry stubbed rects.)
  const rectAt = (top : number) => () => ({ top, left : 0, bottom : top + 50, right : 10, width : 10, height : 50, x : 0, y : top, toJSON : () => ({}) }) as unknown as DOMRect;
  const original : typeof window.scrollTo = window.scrollTo;
  const scrollTo = vi.fn();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;

  try {
    const tabs = document.createElement('div');
    tabs.className = 'top-bar--tabs';
    tabs.getBoundingClientRect = rectAt(900);
    document.body.appendChild(tabs);
    const started = render(<Tour { ...props({ initialStep : 'welcome' }) } />);
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenLastCalledWith({ top : 840, behavior : 'auto' });
    started.unmount();
    tabs.remove();

    const shell = document.createElement('div');
    document.body.appendChild(shell);
    const frame = document.createElement('div');
    frame.className = 'box-frame';
    frame.getBoundingClientRect = rectAt(-200);
    shell.appendChild(frame);
    const resumed = render(<Tour { ...props({ initialStep : 'macros' }) } />);
    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(scrollTo).toHaveBeenLastCalledWith({ top : 0, behavior : 'auto' });
    resumed.unmount();
    shell.remove();
  } finally {
    window.scrollTo = original;
  }
});

test('a visible subject stays exactly where the user put it', () => {
  // Only subjects actually out of view move: a step landing on visible
  // UI must never yank the page.
  const original : typeof window.scrollTo = window.scrollTo;
  const scrollTo = vi.fn();
  window.scrollTo = scrollTo as unknown as typeof window.scrollTo;

  try {
    const tabs = document.createElement('div');
    tabs.className = 'top-bar--tabs';
    tabs.getBoundingClientRect = () => ({ top : 100, left : 0, bottom : 150, right : 10, width : 10, height : 50, x : 0, y : 100, toJSON : () => ({}) }) as unknown as DOMRect;
    document.body.appendChild(tabs);
    const { unmount } = render(<Tour { ...props({ initialStep : 'welcome' }) } />);
    expect(scrollTo).not.toHaveBeenCalled();
    unmount();
    tabs.remove();
  } finally {
    window.scrollTo = original;
  }
});

function mockMatchMedia (matches : boolean) {
  return (() => ({ matches })) as unknown as typeof window.matchMedia;
}

test('the map step warns when the map is stepped out', () => {
  // Narrow viewport: no pointing at a strip the user cannot see.
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(true);
  try {
    const { container } = render(<Tour { ...props({ initialStep : 'boxmap' }) } />);
    expect(titleOf(container)).toBe('The box map');
    expect(container.querySelector('.tour--body')?.textContent).toMatch(/too narrow/);
  }
  finally {
    window.matchMedia = original;
  }
});

test('the map step stays plain on wide screens', () => {
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(false);
  try {
    const { container } = render(<Tour { ...props({ initialStep : 'boxmap' }) } />);
    expect(container.querySelector('.tour--body')?.textContent).not.toMatch(/too narrow/);
  }
  finally {
    window.matchMedia = original;
  }
});

// A folded top bar: closed action cluster holding the switch, plus a
// working hamburger that really opens and closes it.
function plantFoldedBar () : { actions : HTMLElement, cleanup : () => void } {
  const actions = document.createElement('div');
  actions.className = 'top-bar--actions';
  const zen = document.createElement('button');
  zen.className = 'top-bar--zen';
  actions.appendChild(zen);
  const toggle = document.createElement('button');
  toggle.setAttribute('aria-label', 'Menu');
  toggle.addEventListener('click', () => actions.classList.toggle('top-bar--actions--open'));
  document.body.appendChild(actions);
  document.body.appendChild(toggle);
  return { actions, cleanup : () => { actions.remove(); toggle.remove(); } };
}

test('steps pointing into the folded bar open the menu', () => {
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(true);
  const bar = plantFoldedBar();
  try {
    render(<Tour { ...props({ initialStep : 'zen' }) } />);
    expect(bar.actions.classList.contains('top-bar--actions--open')).toBe(true);
  }
  finally {
    bar.cleanup();
    window.matchMedia = original;
  }
});

test('steps pointing elsewhere close the open menu', () => {
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(true);
  const bar = plantFoldedBar();
  bar.actions.classList.add('top-bar--actions--open');
  try {
    render(<Tour { ...props({ initialStep : 'welcome' }) } />);
    expect(bar.actions.classList.contains('top-bar--actions--open')).toBe(false);
  }
  finally {
    bar.cleanup();
    window.matchMedia = original;
  }
});

test('the menu stays untouched on wide screens', () => {
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(false);
  const bar = plantFoldedBar();
  try {
    render(<Tour { ...props({ initialStep : 'zen' }) } />);
    expect(bar.actions.classList.contains('top-bar--actions--open')).toBe(false);
  }
  finally {
    bar.cleanup();
    window.matchMedia = original;
  }
});

// A folded box bar: closed icon row holding the gear, plus a working
// hamburger that really opens and closes it.
function plantBoxBar () : { controls : HTMLElement, cleanup : () => void } {
  const bar = document.createElement('div');
  bar.className = 'boxTopBar';
  const controls = document.createElement('div');
  controls.className = 'box-top-bar-controls';
  const gear = document.createElement('div');
  gear.setAttribute('title', "Open this Boxs' settings");
  controls.appendChild(gear);
  const toggle = document.createElement('div');
  toggle.className = 'box-top-bar--compact-toggle';
  toggle.addEventListener('click', () => controls.classList.toggle('box-top-bar-controls--open'));
  bar.appendChild(controls);
  bar.appendChild(toggle);
  document.body.appendChild(bar);
  return { controls, cleanup : () => bar.remove() };
}

test('settings steps open the folded box menu', () => {
  // The gear hides under the hamburger, and every Next tap shuts it
  // again — so each step explaining box settings re-opens it, whether
  // its own subject is the gear or a panel row.
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(true);
  for (const step of [ 'settings', 'set-sli', 'set-strategy' ]) {
    const bar = plantBoxBar();
    try {
      render(<Tour { ...props({ initialStep : step }) } />);
      expect(bar.controls.classList.contains('box-top-bar-controls--open')).toBe(true);
    }
    finally {
      bar.cleanup();
    }
  }
  window.matchMedia = original;
});

test('other steps close the folded box menu', () => {
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(true);
  const bar = plantBoxBar();
  bar.controls.classList.add('box-top-bar-controls--open');
  try {
    render(<Tour { ...props({ initialStep : 'macros' }) } />);
    expect(bar.controls.classList.contains('box-top-bar-controls--open')).toBe(false);
  }
  finally {
    bar.cleanup();
    window.matchMedia = original;
  }
});

test('panel steps keep the folded menu shut', () => {
  // The panel has priority: opening the menu under it would only
  // overlap, so steps opening a panel never unfold it — while the
  // panel still opens through the hidden icon.
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(true);
  const onThemes = vi.fn();
  const actions = document.createElement('div');
  actions.className = 'top-bar--actions';
  const themes = document.createElement('button');
  themes.setAttribute('title', 'Accent theme');
  themes.addEventListener('click', onThemes);
  actions.appendChild(themes);
  const toggle = document.createElement('button');
  toggle.setAttribute('aria-label', 'Menu');
  toggle.addEventListener('click', () => actions.classList.toggle('top-bar--actions--open'));
  document.body.appendChild(actions);
  document.body.appendChild(toggle);
  try {
    render(<Tour { ...props({ initialStep : 'yours' }) } />);
    expect(onThemes).toHaveBeenCalledTimes(1);
    expect(actions.classList.contains('top-bar--actions--open')).toBe(false);
  }
  finally {
    actions.remove();
    toggle.remove();
    window.matchMedia = original;
  }
});

test('the cleaning step unfolds the menu without a panel', () => {
  // Step 11 shows just the button: the menu opens on the eraser and
  // no panel opens under it.
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(true);
  const onEraser = vi.fn();
  const actions = document.createElement('div');
  actions.className = 'top-bar--actions';
  const eraser = document.createElement('button');
  eraser.setAttribute('title', 'Clearing options');
  eraser.addEventListener('click', onEraser);
  actions.appendChild(eraser);
  const toggle = document.createElement('button');
  toggle.setAttribute('aria-label', 'Menu');
  toggle.addEventListener('click', () => actions.classList.toggle('top-bar--actions--open'));
  document.body.appendChild(actions);
  document.body.appendChild(toggle);
  try {
    const { container } = render(<Tour { ...props({ initialStep : 'cleaning' }) } />);
    expect(titleOf(container)).toBe('A clean slate');
    expect(onEraser).not.toHaveBeenCalled();
    expect(actions.classList.contains('top-bar--actions--open')).toBe(true);
  }
  finally {
    actions.remove();
    toggle.remove();
    window.matchMedia = original;
  }
});

test('the box menu stays untouched on wide screens', () => {
  const original = window.matchMedia;
  window.matchMedia = mockMatchMedia(false);
  const bar = plantBoxBar();
  try {
    render(<Tour { ...props({ initialStep : 'settings' }) } />);
    expect(bar.controls.classList.contains('box-top-bar-controls--open')).toBe(false);
  }
  finally {
    bar.cleanup();
    window.matchMedia = original;
  }
});

test('the ring heals onto controls landing after arrival', async () => {
  // The exit button lands a beat after the step (its panel commits
  // separately): the ring follows it instead of missing it outright.
  const eraser = document.createElement('button');
  eraser.setAttribute('title', 'Clearing options');
  eraser.addEventListener('click', () => {
    const exit = document.createElement('button');
    exit.className = 'btn top-bar--clear-btn';
    exit.setAttribute('title', 'Erase all boxes in Test');
    exit.getBoundingClientRect = () => ({ top : 60, left : 0, bottom : 90, right : 10, width : 10, height : 30, x : 0, y : 60, toJSON : () => ({}) }) as unknown as DOMRect;
    document.body.appendChild(exit);
  });
  document.body.appendChild(eraser);
  const { container, unmount } = render(<Tour { ...props({ initialStep : 'clean-notebook' }) } />);
  try {
    await waitFor(() => expect(container.querySelector('.tour--ring')).not.toBeNull());
  }
  finally {
    unmount();
    eraser.remove();
    document.querySelectorAll('.top-bar--clear-btn').forEach((el) => el.remove());
  }
});
