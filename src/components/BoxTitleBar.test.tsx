import { test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import BoxTitleBar from './BoxTitleBar';
import { BoxType, BoxState } from '../Types';

afterEach(() => cleanup());

function props (state : BoxState) {
  return {
    state,
    isActive : true,
    isFocused : true,
    seatBox : () => void 0,
    removeBox : () => void 0,
    updateBoxState : () => void 0,
    addBoxBefore : () => void 0,
    addBoxAfter : () => void 0,
    hideTitle : true,
  };
}

test('macro toggle lives on the left for lambda boxes', () => {
  // The popup docks to the box's left, so the toggle sits with the
  // left-side controls, ahead of the right-side box furniture.
  const state = { type : BoxType.UNTYPED_LAMBDA, title : '', minimized : false } as unknown as BoxState;
  const { container } = render(<BoxTitleBar { ...props(state) } />);

  const left = container.querySelector('.box-top-bar-custom--left') as HTMLElement;
  const toggle = container.querySelector('[title="Show All Macros for This Box"]') as HTMLElement;
  const controls = container.querySelector('.box-top-bar-controls') as HTMLElement;
  expect(left.contains(toggle)).toBe(true);
  expect(left.compareDocumentPosition(controls) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0);
});

test('markdown keeps its right-side custom group', () => {
  const state = { type : BoxType.MARKDOWN, title : 'Note' } as unknown as BoxState;
  const { container } = render(<BoxTitleBar { ...props(state) } hideTitle={ false } />);

  expect(container.querySelector('.box-top-bar-custom--left')).toBeNull();
  expect(container.querySelector('.box-top-bar-custom')).not.toBeNull();
});
