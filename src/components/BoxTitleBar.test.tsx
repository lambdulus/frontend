import React from 'react';
import { test, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import BoxTitleBar from './BoxTitleBar';
import { BoxType, BoxState } from '../Types';
import { createNewUntypedLambdaExpression, defaultSettings, SETTINGS_OPENED_EVENT } from '../untyped-lambda-integration/Constants';

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

function bar (settingsOpen : boolean, updateBoxState : (box : BoxState) => void) {
  const state = createNewUntypedLambdaExpression(defaultSettings);
  state.type = BoxType.UNTYPED_LAMBDA;
  state.settingsOpen = settingsOpen;
  return render(
    <BoxTitleBar
      state={ state }
      isActive={ true }
      isFocused={ true }
      seatBox={ () => void 0 }
      removeBox={ () => void 0 }
      updateBoxState={ updateBoxState }
      addBoxBefore={ () => void 0 }
      addBoxAfter={ () => void 0 }
    />
  );
}

const GEAR = '[title="Open this Boxs\' settings"]';

test('opening settings from the gear broadcasts for other boxes', () => {
  const heard : Array<string> = [];
  const onOpened = (event : Event) => {
    heard.push((event as CustomEvent<{ key : string }>).detail.key);
  };
  document.addEventListener(SETTINGS_OPENED_EVENT, onOpened);
  const updated : Array<BoxState> = [];
  try {
    const { container, unmount } = bar(false, (box) => { updated.push(box); });
    try {
      fireEvent.click(container.querySelector(GEAR) as HTMLElement);
      expect(updated.length).toBe(1);
      expect((updated[0] as { settingsOpen : boolean }).settingsOpen).toBe(true);
      expect(heard).toEqual([ (updated[0] as { __key : string }).__key ]);
    }
    finally {
      unmount();
    }
  }
  finally {
    document.removeEventListener(SETTINGS_OPENED_EVENT, onOpened);
  }
});

test('closing settings from the gear broadcasts nothing', () => {
  const heard : Array<string> = [];
  const onOpened = (event : Event) => {
    heard.push((event as CustomEvent<{ key : string }>).detail.key);
  };
  document.addEventListener(SETTINGS_OPENED_EVENT, onOpened);
  const updated : Array<BoxState> = [];
  try {
    const { container, unmount } = bar(true, (box) => { updated.push(box); });
    try {
      fireEvent.click(container.querySelector(GEAR) as HTMLElement);
      expect(updated.length).toBe(1);
      expect((updated[0] as { settingsOpen : boolean }).settingsOpen).toBe(false);
      expect(heard).toEqual([]);
    }
    finally {
      unmount();
    }
  }
  finally {
    document.removeEventListener(SETTINGS_OPENED_EVENT, onOpened);
  }
});
