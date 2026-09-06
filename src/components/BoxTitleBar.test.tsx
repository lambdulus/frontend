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

test('lambda title bar carries no macro toggle', () => {
  // The macro dock owns its pill now; nothing toggle-like remains in
  // the bar, left or right.
  const state = { type : BoxType.UNTYPED_LAMBDA, title : '', minimized : false } as unknown as BoxState;
  const { container } = render(<BoxTitleBar { ...props(state) } />);

  expect(container.querySelector('.box-top-bar-custom--left')).toBeNull();
  expect(container.querySelector('[title*="acro"]')).toBeNull();
});

test('markdown keeps its right-side custom group', () => {
  const state = { type : BoxType.MARKDOWN, title : 'Note' } as unknown as BoxState;
  const { container } = render(<BoxTitleBar { ...props(state) } hideTitle={ false } />);

  expect(container.querySelector('.box-top-bar-custom--left')).toBeNull();
  expect(container.querySelector('.box-top-bar-custom')).not.toBeNull();
});
