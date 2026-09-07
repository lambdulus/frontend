import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import DebugControls from './DebugControls';

afterEach(() => cleanup());

function props (enabled : boolean, onStep : () => void) {
  return {
    isRunning : false,
    shortcutsEnabled : enabled,
    onStep,
    onRun : () => void 0,
  };
}

test('F8 steps only the enabled controls', () => {
  // Every box mounts its own listener; only the anchor answers, so
  // the shortcut can never fire a background box.
  const background = vi.fn();
  const anchor = vi.fn();
  render(
    <div>
      <DebugControls { ...props(false, background) } />
      <DebugControls { ...props(true, anchor) } />
    </div>
  );

  fireEvent.keyDown(document, { key : 'F8' });
  expect(background).not.toHaveBeenCalled();
  expect(anchor).toHaveBeenCalledTimes(1);
});

test('unmounting one box does not silence the others', () => {
  // Listeners are per-instance: removing a box takes only its own.
  const kept = vi.fn();
  const gone = render(<DebugControls { ...props(true, vi.fn()) } />);
  const stay = render(<DebugControls { ...props(true, kept) } />);
  try {
    gone.unmount();
    fireEvent.keyDown(document, { key : 'F8' });
    expect(kept).toHaveBeenCalledTimes(1);
  }
  finally {
    stay.unmount();
  }
});
