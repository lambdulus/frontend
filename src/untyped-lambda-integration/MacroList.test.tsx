import { readFileSync } from 'fs';
import { test, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import MacroList from './MacroList';

afterEach(() => cleanup());

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
