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
  const { container } = render(<Tour initialStep={ 0 } onClose={ onClose } />);

  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[0].title);
  expect(container.querySelector('.tour--kicker')?.textContent).toContain('1 of 6');

  fireEvent.click(buttons(container).next as HTMLElement);
  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[1].title);
  expect(loadTourState()).toEqual({ step : 1, done : false });

  fireEvent.click(buttons(container).back as HTMLElement);
  expect(container.querySelector('.tour--title')?.textContent).toBe(TOUR_STEPS[0].title);
  expect(loadTourState()).toEqual({ step : 0, done : false });
  expect(onClose).not.toHaveBeenCalled();
});

test('skip snoozes at the current step, done restarts from zero', () => {
  const onClose = vi.fn();
  const { container, unmount } = render(<Tour initialStep={ 2 } onClose={ onClose } />);
  expect(container.querySelector('.tour--kicker')?.textContent).toContain('3 of 6');

  fireEvent.click(buttons(container).skip as HTMLElement);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 2, done : true });
  unmount();

  const onClose2 = vi.fn();
  const second = render(<Tour initialStep={ 5 } onClose={ onClose2 } />);
  expect(second.container.querySelector('.tour--kicker')?.textContent).toContain('6 of 6');
  expect(buttons(second.container).next).toBeNull();
  fireEvent.click(buttons(second.container).done as HTMLElement);
  expect(onClose2).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 0, done : true });
});

test('backdrop click snoozes like skip', () => {
  const onClose = vi.fn();
  const { container } = render(<Tour initialStep={ 1 } onClose={ onClose } />);
  fireEvent.click(container.querySelector('.tour--backdrop') as HTMLElement);
  expect(onClose).toHaveBeenCalledTimes(1);
  expect(loadTourState()).toEqual({ step : 1, done : true });
});

test('out-of-range initial step clamps into the tour', () => {
  const { container } = render(<Tour initialStep={ 99 } onClose={ () => void 0 } />);
  expect(container.querySelector('.tour--kicker')?.textContent).toContain('6 of 6');
});

test('missing targets never break the card', () => {
  // jsdom rects are zero-sized, so no ring — but the card stands alone.
  const { container } = render(<Tour initialStep={ 0 } onClose={ () => void 0 } />);
  expect(container.querySelector('.tour--ring')).toBeNull();
  expect(container.querySelector('[role="dialog"]')).not.toBeNull();
});
