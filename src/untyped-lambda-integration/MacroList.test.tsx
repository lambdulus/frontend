import { readFileSync } from 'fs';
import { test, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import MacroList from './MacroList';
import UntypedLambdaBox from './UntypedLambdaBox';
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
      setBoxState={ setBoxState }
      addBox={ () => void 0 }
    />
  );
}

test('macro dock pill toggles the three-part panel', () => {
  const setBoxState = vi.fn();
  const { container, rerender } = renderDock(false, setBoxState);

  // Closed: the pill floats alone.
  const head = container.querySelector('.macro-dock--head') as HTMLElement;
  expect(head.textContent).toMatch(/Macros/);
  expect(container.querySelector('.macro-dock--open')).toBeNull();
  expect(container.querySelector('.macro-dock--body')).toBeNull();
  expect(container.querySelector('.macro-dock--foot')).toBeNull();

  fireEvent.click(head);
  expect(setBoxState).toHaveBeenCalledWith(expect.objectContaining({ macrolistOpen : true }));

  // Open: header, scrolling middle, pinned footer collapse.
  rerender(
    <UntypedLambdaBox
      state={ lambdaState(true) }
      isActive={ true }
      isFocused={ true }
      setBoxState={ setBoxState }
      addBox={ () => void 0 }
    />
  );
  expect(container.querySelector('.macro-dock--open')).not.toBeNull();
  expect(container.querySelector('.macro-dock--body .macro-list')).not.toBeNull();
  const foot = container.querySelector('.macro-dock--foot') as HTMLElement;
  fireEvent.click(foot);
  expect(setBoxState).toHaveBeenCalledWith(expect.objectContaining({ macrolistOpen : false }));
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
