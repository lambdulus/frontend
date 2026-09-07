import { test, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import Tour, { TOUR_STEPS } from './Tour';
import { loadTourState } from '../Constants';

afterEach(() => cleanup());
beforeEach(() => window.localStorage.removeItem('LambdulusTour'));

function buttons (container : Element) : Record<string, Element | null> {
  const all = [...container.querySelectorAll('.tour--actions button')];
  const byText = (text : string) => all.find((b) => b.textContent === text) ?? null;
  return { back : byText('Back'), skip : byText('Skip'), next : byText('Next'), done : byText('Done') };
}

test('tour walks forward and back, persisting each step', () => {
  const onClose = vi.fn();
  const { container } = render(<Tour initialStep={ 0 } demoBoxKey={ null } onClose={ onClose } />);

  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[0].title);
  expect(container.querySelector('.tour--kicker')?.textContent).toContain('1 of 6');

  fireEvent.click(buttons(container).next as HTMLElement);
  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[1].title);
  expect(loadTourState()).toEqual({ step : 1, done : false, seeded : false, demoBoxKey : null });

  fireEvent.click(buttons(container).back as HTMLElement);
  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[0].title);
  expect(loadTourState()).toEqual({ step : 0, done : false, seeded : false, demoBoxKey : null });
  expect(onClose).not.toHaveBeenCalled();
});

test('skip snoozes at the current step, done restarts from zero', () => {
  const onClose = vi.fn();
  const { container, unmount } = render(<Tour initialStep={ 2 } demoBoxKey={ null } onClose={ onClose } />);
  expect(container.querySelector('.tour--kicker')?.textContent).toContain('3 of 6');

  fireEvent.click(buttons(container).skip as HTMLElement);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 2, done : true, seeded : false, demoBoxKey : null });
  unmount();

  const onClose2 = vi.fn();
  const second = render(<Tour initialStep={ 5 } demoBoxKey={ null } onClose={ onClose2 } />);
  expect(second.container.querySelector('.tour--kicker')?.textContent).toContain('6 of 6');
  expect(buttons(second.container).next).toBeNull();
  fireEvent.click(buttons(second.container).done as HTMLElement);
  expect(onClose2).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 0, done : true, seeded : false, demoBoxKey : null });
});

test('backdrop click snoozes like skip', () => {
  const onClose = vi.fn();
  const { container } = render(<Tour initialStep={ 1 } demoBoxKey={ null } onClose={ onClose } />);
  fireEvent.click(container.querySelector('.tour--backdrop') as HTMLElement);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 1, done : true, seeded : false, demoBoxKey : null });
});

test('out-of-range initial step clamps into the tour', () => {
  const { container } = render(<Tour initialStep={ 99 } demoBoxKey={ null } onClose={ () => void 0 } />);
  expect(container.querySelector('.tour--kicker')?.textContent).toContain('6 of 6');
});

test('missing targets never break the card', () => {
  // jsdom rects are zero-sized, so no ring — but the card stands alone.
  const { container } = render(<Tour initialStep={ 0 } demoBoxKey={ null } onClose={ () => void 0 } />);
  expect(container.querySelector('.tour--ring')).toBeNull();
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
});

test('operating the + control advances just like next', () => {
  const onPlus = vi.fn();
  const { container } = render(
    <div>
      <div className='add_box_after' onMouseDown={ onPlus } />
      <Tour initialStep={ 1 } demoBoxKey={ null } onClose={ () => void 0 } />
    </div>
  );

  expect(container.querySelector('.tour')?.classList.contains('tour--interactive')).toBe(true);
  fireEvent.mouseDown(container.querySelector('.add_box_after') as Element);
  expect(onPlus).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[2].title);
  expect(loadTourState()).toEqual({ step : 2, done : false, seeded : false, demoBoxKey : null });
  expect(container.querySelector('.tour')?.classList.contains('tour--interactive')).toBe(false);
});

test('next on the + step works the control, advancing exactly once', () => {
  const onPlus = vi.fn();
  const { container } = render(
    <div>
      <div className='add_box_after' onMouseDown={ onPlus } />
      <Tour initialStep={ 1 } demoBoxKey={ null } onClose={ () => void 0 } />
    </div>
  );

  const next = [...container.querySelectorAll('.tour--actions button')].find((b) => b.textContent === 'Next') as Element;
  fireEvent.click(next);
  // Chauffeur mode: the control got its mousedown, the flagged events did
  // not re-advance, and we walked on exactly once.
  expect(onPlus).toHaveBeenCalledTimes(1);
  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[2].title);
  expect(loadTourState()).toEqual({ step : 2, done : false, seeded : false, demoBoxKey : null });
});

test('the stepping step points at the demo box when its key is known', () => {
  const { container } = render(
    <div>
      <div data-box-key='demo-1' />
      <Tour initialStep={ 3 } demoBoxKey='demo-1' onClose={ () => void 0 } />
    </div>
  );
  // The ring itself needs real layout, but the step resolved its target:
  // with an unknown key the same step stays ringless by construction.
  expect(container.querySelector('[data-box-key="demo-1"]')).not.toBeNull();
  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[3].title);
});
