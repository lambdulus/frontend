import { test, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { BoxContainer } from './BoxContainer';
import { BoxType } from '../Types';
import { NoteState } from '../markdown-integration/AppTypes';

afterEach(() => cleanup());

function box () : NoteState {
  return {
    __key : 'a',
    type : BoxType.MARKDOWN,
    title : 'Note',
    minimized : false,
    settingsOpen : false,
    note : 'first',
    isEditing : false,
    editor : { placeholder : '', content : '', caretPosition : 0, syntaxError : null },
  };
}

function props (zen : boolean) {
  return {
    isActiveBox : true,
    isFocusedBox : true,
    zen,
    box : box(),
    seatBox : () => void 0,
    makeActive : () => void 0,
    onBlur : () => void 0,
    updateBoxState : () => void 0,
    removeBox : () => void 0,
    addBoxBefore : () => void 0,
    addBoxAfter : () => void 0,
  };
}

function rect (top : number) : DOMRect {
  return {
    top,
    left : 0,
    bottom : top,
    right : 0,
    width : 0,
    height : 0,
    x : 0,
    y : 0,
    toJSON : () => ({}),
  } as DOMRect;
}

test('resize pinning glues the box across plain resizes but steps aside across zen flips', () => {
  // The pin measures the box top before the commit (snapshot) and
  // after, scrolling the page by the drift so the box stays put.
  // Across a zen flip that same scroll would fire the scroll-prime
  // sync mid-reflow and re-derive focus onto the last box, so the
  // pin must not run there: the flip seats the anchor itself.
  const originalScrollBy = window.scrollBy;
  const scrollBy = vi.fn();
  window.scrollBy = scrollBy;
  const { container, rerender, unmount } = render(<BoxContainer { ...props(false) } />);
  try {
    const root = container.firstElementChild as HTMLElement;
    let tops = [ 100, 140 ];
    root.getBoundingClientRect = () => rect(tops.length > 0 ? (tops.shift() as number) : 140);

    // Plain resize with the same props: the 40px drift scrolls along.
    rerender(<BoxContainer { ...props(false) } />);
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top : 40, behavior : 'auto' });

    // Zen flip with the same drift: no pinning, the flip owns scroll.
    tops = [ 100, 140 ];
    rerender(<BoxContainer { ...props(true) } />);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  }
  finally {
    unmount();
    window.scrollBy = originalScrollBy;
  }
});
