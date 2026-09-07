import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup, waitFor } from '@testing-library/react';
import Tour, { TOUR_STEPS } from './Tour';
import { loadTourState } from '../Constants';

afterEach(() => cleanup());
beforeEach(() => window.localStorage.removeItem('LambdulusTour'));

interface TourCallbacks {
  onClose : () => void
  onAddLambdaBox : () => string | null
  onFillBoxEditor : (boxKey : string, content : string) => void
  onDeleteBox : (boxKey : string) => void
}

function props (over : Partial<{ initialStep : string } & TourCallbacks> = {}) {
  return {
    initialStep : 'welcome',
    onClose : () => void 0,
    onAddLambdaBox : () => null,
    onFillBoxEditor : () => void 0,
    onDeleteBox : () => void 0,
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
  const second = render(<Tour { ...props({ initialStep : 'yours', onClose : onClose2 }) } />);
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

test('the tour ids stay addressable', () => {
  expect(TOUR_STEPS.map((s) => s.id)).toEqual([
    'welcome', 'add', 'pick', 'type', 'stepping',
    'settings', 'set-sli', 'set-sde', 'set-collapse', 'set-strategy',
    'macros', 'yours', 'md-explain', 'md-delete',
  ]);
});

test('deleting early on the explainer loops back at once', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  const frame = plantFrame(container, 'markDownBox', 'k-md');
  await waitFor(() => expect(titleOf(container)).toBe('A Markdown box'));

  frame.remove();
  await waitFor(() => expect(titleOf(container)).toBe('Add a box'));
  expect(loadTourState()).toEqual({ step : 'add', done : false });
});

test('settings next opens the real gear and walks each switch', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  const frame = plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  const gear = document.createElement('div');
  gear.setAttribute('title', 'Open this Boxs\' settings');
  const opened : Array<string> = [];
  gear.addEventListener('click', () => opened.push('gear'));
  frame.appendChild(gear);
  await waitFor(() => expect(titleOf(container)).toBe('Write and evaluate'));

  const evaluated = document.createElement('div');
  evaluated.className = 'box-history-wrap';
  frame.appendChild(evaluated);
  await waitFor(() => expect(titleOf(container)).toBe('Step through evaluation'));

  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('Box settings');

  fireEvent.click(nextBtn(container));
  expect(opened).toEqual([ 'gear' ]);
  expect(titleOf(container)).toBe('Single Letter Names');

  for (const title of [ 'Simplified Evaluation', 'Collapse Old Steps', 'Evaluation Strategies' ]) {
    fireEvent.click(nextBtn(container));
    expect(titleOf(container)).toBe(title);
  }

  fireEvent.click(nextBtn(container));
  expect(titleOf(container)).toBe('Macros');
});

test('dictated expressions render as delimited code', async () => {
  const { container } = render(<Tour { ...props({ initialStep : 'pick' }) } />);
  plantFrame(container, 'untypedLambdaBox', 'k-lambda');
  await waitFor(() => expect(titleOf(container)).toBe('Write and evaluate'));

  const code = container.querySelector('.tour--code');
  expect(code?.textContent).toBe('(λ x . x y) a');
});
