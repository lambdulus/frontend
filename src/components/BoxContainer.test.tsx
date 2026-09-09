import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
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
    isAnchorBox : true,
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

test('bare top-bar click seats and focuses the box', () => {
  // The bar used to scroll without moving focus (no map highlight, no
  // shadow); every control in it stops propagation for itself, so only
  // bare-bar clicks reach this handler.
  const seatBox = vi.fn();
  const makeActive = vi.fn();
  const { container, unmount } = render(<BoxContainer { ...props(false) } seatBox={ seatBox } makeActive={ makeActive } />);
  try {
    fireEvent.click(container.querySelector('.boxTopBar') as HTMLElement);
    expect(seatBox).toHaveBeenCalledTimes(1);
    expect(makeActive).toHaveBeenCalledTimes(1);
  }
  finally {
    unmount();
  }
});

function rect (top : number, height : number = 0) : DOMRect {
  return {
    top,
    left : 0,
    bottom : top + height,
    right : 0,
    width : 0,
    height,
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
    let frames : Array<[number, number]> = [ [ 100, 200 ], [ 140, 260 ] ];
    root.getBoundingClientRect = () => {
      const [ top, height ] = frames.length > 0 ? (frames.shift() as [number, number]) : [ 140, 260 ];
      return rect(top, height);
    };

    // Plain resize with the same props: the box grew and drifted 40px,
    // so the page scrolls along to keep it glued.
    rerender(<BoxContainer { ...props(false) } />);
    expect(scrollBy).toHaveBeenCalledTimes(1);
    expect(scrollBy).toHaveBeenCalledWith({ top : 40, behavior : 'auto' });

    // Zen flip with the same drift: no pinning, the flip owns scroll.
    frames = [ [ 100, 200 ], [ 140, 260 ] ];
    rerender(<BoxContainer { ...props(true) } />);
    expect(scrollBy).toHaveBeenCalledTimes(1);
  }
  finally {
    unmount();
    window.scrollBy = originalScrollBy;
  }
});

test('sibling displacement without self-resize pins nothing', () => {
  // A sibling's new step line pushes this box down without resizing
  // it: pinning here scrolled once per box below the change, fighting
  // the browser's scroll anchoring as a per-step jitter. The native
  // compensation owns this case, so the pin must stay quiet.
  const originalScrollBy = window.scrollBy;
  const scrollBy = vi.fn();
  window.scrollBy = scrollBy;
  const { container, rerender, unmount } = render(<BoxContainer { ...props(false) } />);
  try {
    const root = container.firstElementChild as HTMLElement;
    let frames : Array<[number, number]> = [ [ 100, 200 ], [ 140, 200 ] ];
    root.getBoundingClientRect = () => {
      const [ top, height ] = frames.length > 0 ? (frames.shift() as [number, number]) : [ 140, 200 ];
      return rect(top, height);
    };

    rerender(<BoxContainer { ...props(false) } />);
    expect(scrollBy).not.toHaveBeenCalled();
  }
  finally {
    unmount();
    window.scrollBy = originalScrollBy;
  }
});

test('markdown box hides its title like lambda boxes', () => {
  // Parity with UNTYPED_LAMBDA: the editable title is gone from the bar
  // (the spacer keeps the controls right-aligned instead).
  const { container, unmount } = render(<BoxContainer { ...props(false) } />);
  try {
    expect(container.querySelector('.boxTopBar .topBarTitle')).toBeNull();
    expect(container.querySelector('.boxTopBar .boxTopBar-spacer')).not.toBeNull();
    // The markdown Edit/Preview toggle stays on the right.
    expect(container.querySelector('.box-top-bar-custom')).not.toBeNull();
  }
  finally {
    unmount();
  }
});
