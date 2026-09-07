import { readFileSync } from 'fs';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import MacroList from './MacroList';
import UntypedLambdaBox, { dockClassName } from './UntypedLambdaBox';
import { EvaluationStrategy, UntypedLambdaState, UntypedLambdaType } from './Types';
import { BoxType } from '../Types';

afterEach(() => cleanup());

function lambdaState (macrolistOpen : boolean) : UntypedLambdaState {
  return {
    type : BoxType.UNTYPED_LAMBDA,
    subtype : UntypedLambdaType.EMPTY,
    title : '',
    minimized : false,
    settingsOpen : false,
    macrolistOpen,
    macrotable : {},
    SLI : false,
    expandStandalones : false,
    strategy : EvaluationStrategy.NORMAL,
    SDE : true,
    collapseOldSteps : true,
    editor : { placeholder : '', content : '', syntaxError : null },
  } as unknown as UntypedLambdaState;
}

function renderDock (macrolistOpen : boolean, setBoxState : (state : UntypedLambdaState) => void) {
  return render(
    <UntypedLambdaBox
      state={ lambdaState(macrolistOpen) }
      isActive={ true }
      isFocused={ true }
      isAnchorBox={ true }
      setBoxState={ setBoxState }
      addBox={ () => void 0 }
    />
  );
}

test('macro dock pill toggles the panel both ways', () => {
  const setBoxState = vi.fn();
  const { container, rerender } = renderDock(false, setBoxState);

  // Closed: the pill floats alone over a collapsed panel.
  const head = container.querySelector('.macro-dock--head') as HTMLElement;
  expect(head.textContent).toMatch(/Macros/);
  expect(container.querySelector('.macro-dock--open')).toBeNull();
  expect(container.querySelector('.macro-dock--panel')).not.toBeNull();

  fireEvent.click(head);
  expect(setBoxState).toHaveBeenCalledWith(expect.objectContaining({ macrolistOpen : true, macrolistWanted : true }));

  // Open: the same head collapses back (chevron swapped).
  rerender(
    <UntypedLambdaBox
      state={ lambdaState(true) }
      isActive={ true }
      isFocused={ true }
      isAnchorBox={ true }
      setBoxState={ setBoxState }
      addBox={ () => void 0 }
    />
  );
  expect(container.querySelector('.macro-dock--open')).not.toBeNull();
  expect(container.querySelector('.macro-dock--scroll .macro-list')).not.toBeNull();
  const openHead = container.querySelector('.macro-dock--head') as HTMLElement;
  fireEvent.click(openHead);
  expect(setBoxState).toHaveBeenCalledWith(expect.objectContaining({ macrolistOpen : false, macrolistWanted : false }));
});

test('macro table renders one clean row per macro', () => {
  const { container } = render(<MacroList macroTable={ { LONGNAME : 'λf.(λx.f (x x)) (λx.f (x x)) λf.(λx.f (x x)) (λx.f (x x))' } } />);

  // The user row plus the built-ins, each with a name and a body...
  const rows = container.querySelectorAll('.macro-row');
  expect(rows.length).toBeGreaterThan(1);
  const names = Array.from(container.querySelectorAll('.macro-name')).map((el) => el.textContent);
  expect(names).toContain('LONGNAME');
  const lastBody = rows[rows.length - 1].querySelector('.macro-body')?.textContent ?? '';
  expect(lastBody).toContain('(λx.f (x x))');

  // ...and none of the underline-era markup remains.
  expect(container.querySelectorAll('.macro-definition').length).toBe(0);
});

test('empty macro table says how to define one', () => {
  const { container } = render(<MacroList macroTable={ {} } />);
  expect(container.querySelector('.macro-empty')?.textContent).toMatch(/No user-defined macros yet/);
});

test('macro rows wrap with room and no rules', () => {
  const css = readFileSync('src/untyped-lambda-integration/styles/MacroList.css', 'utf8');
  const row = css.match(/\.macro-row\s*\{[^}]*\}/)?.[0] ?? '';
  expect(row).toMatch(/line-height\s*:\s*1\.5/);
  expect(row).not.toMatch(/border-bottom/);
  const body = css.match(/\.macro-body\s*\{[^}]*\}/)?.[0] ?? '';
  expect(body).toMatch(/overflow-wrap\s*:\s*break-word/);
});

test('the card chrome fades with the panel, never snaps', () => {
  // The naked-content flash: on close the open class (and its white
  // card) vanished instantly while the content faded out. Fading the
  // chrome alongside doubles as the expand animation on focus, blooming
  // slower than the closing fade so handoffs never read as one morph.
  const css = readFileSync('src/untyped-lambda-integration/styles/MacroList.css', 'utf8');
  const dock = css.match(/\.macro-dock\s*\{[^}]*\}/)?.[0] ?? '';
  expect(dock).toMatch(/background-color\s*:\s*transparent/);
  expect(dock).toMatch(/border\s*:\s*1px solid transparent/);
  const open = css.match(/\.macro-dock--open\s*\{[^}]*\}/)?.[0] ?? '';
  const beat = (rule : string) => {
    const list = rule.match(/transition\s*:([^;]+)/)?.[1] ?? '';
    return Math.max(...[...list.matchAll(/(\d*\.?\d+)s/g)].map((m) => Number(m[1])));
  };
  expect(beat(open)).toBeGreaterThan(beat(dock));
  expect(css).toMatch(/prefers-reduced-motion[\s\S]*?\.macro-dock\s*\{[^}]*transition\s*:\s*none/);
  expect(css).toMatch(/prefers-reduced-motion[\s\S]*?\.macro-dock--open\s*\{[^}]*transition\s*:\s*none/);
});

test('dock classes keep containment through a close', () => {
  expect(dockClassName(false, false)).toBe('macro-dock');
  expect(dockClassName(true, false)).toBe('macro-dock macro-dock--open');
  // Closing bridges open + shut; reopening mid-shut drops the bridge.
  expect(dockClassName(false, true)).toBe('macro-dock macro-dock--open macro-dock--shut');
  expect(dockClassName(true, true)).toBe('macro-dock macro-dock--open');
});

function dockElement (open : boolean) : JSX.Element {
  return (
    <UntypedLambdaBox
      state={ lambdaState(open) }
      isActive={ true }
      isFocused={ true }
      isAnchorBox={ true }
      setBoxState={ () => void 0 }
      addBox={ () => void 0 }
    />
  );
}

test('closing the dock bridges containment, then stands down', () => {
  vi.useFakeTimers();
  try {
    const { container, rerender } = render(dockElement(true));
    const dock = () => container.querySelector('.macro-dock') as HTMLElement;
    expect(dock().className).toBe('macro-dock macro-dock--open');

    rerender(dockElement(false));
    expect(dock().className).toBe('macro-dock macro-dock--open macro-dock--shut');

    act(() => { vi.advanceTimersByTime(200); });
    expect(dock().className).toBe('macro-dock');
  }
  finally {
    vi.useRealTimers();
  }
});

test('reopening mid-shut drops the bridge at once', () => {
  vi.useFakeTimers();
  try {
    const { container, rerender } = render(dockElement(true));
    const dock = () => container.querySelector('.macro-dock') as HTMLElement;

    rerender(dockElement(false));
    expect(dock().className).toBe('macro-dock macro-dock--open macro-dock--shut');

    rerender(dockElement(true));
    expect(dock().className).toBe('macro-dock macro-dock--open');
  }
  finally {
    vi.useRealTimers();
  }
});

test('the shut bridge keeps open containment while collapsing', () => {
  // The whole point: bottom, cap and flex panel still apply through
  // the close, so the fade plays inside the card instead of flashing
  // full-height naked content.
  const css = readFileSync('src/untyped-lambda-integration/styles/MacroList.css', 'utf8');
  const shut = css.match(/\.macro-dock--shut\s*\{[^}]*\}/)?.[0] ?? '';
  expect(shut).not.toMatch(/bottom/);
  expect(shut).not.toMatch(/max-height/);
  expect(shut).toMatch(/background-color\s*:\s*transparent/);
  const shutPanel = css.match(/\.macro-dock--shut \.macro-dock--panel\s*\{[^}]*\}/)?.[0] ?? '';
  expect(shutPanel).toMatch(/opacity\s*:\s*0/);
  expect(shutPanel).toMatch(/visibility\s*:\s*hidden/);
});

test('open tables hang capped instead of filling tall boxes', () => {
  // bottom:0 alone snaps a screen-filling card in one frame on tall
  // boxes; the cap hands the overflow to the inner scroll instead.
  const css = readFileSync('src/untyped-lambda-integration/styles/MacroList.css', 'utf8');
  const open = css.match(/\.macro-dock--open\s*\{[^}]*\}/)?.[0] ?? '';
  expect(open).toMatch(/max-height\s*:\s*70vh/);
});

test('open tables paint above collapsed pills', () => {
  // One shared z-index would let DOM order decide, floating a later
  // box's pill over an earlier box's unfolding table.
  const css = readFileSync('src/untyped-lambda-integration/styles/MacroList.css', 'utf8');
  const closed = css.match(/\.macro-dock\s*\{[^}]*\}/)?.[0] ?? '';
  const open = css.match(/\.macro-dock--open\s*\{[^}]*\}/)?.[0] ?? '';
  const z = (rule : string) => Number(rule.match(/z-index\s*:\s*(\d+)/)?.[1] ?? NaN);
  expect(z(closed)).not.toBeNaN();
  expect(z(open)).toBeGreaterThan(z(closed));
});
