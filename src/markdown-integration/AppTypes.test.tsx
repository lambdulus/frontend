import { readFileSync } from 'fs';
import { test, expect, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import { createNewMarkdown, onMarkDownBlur, NoteState } from './AppTypes';
import BoxTopBar from './BoxTopBar';

afterEach(() => cleanup());

function note (content : string, title : string = 'Markdown Box') : NoteState {
  const state = createNewMarkdown();
  return {
    ...state,
    title,
    note : content,
    editor : { ...state.editor, content },
  };
}

test('top H1 becomes the box title on submit', () => {
  const submitted = onMarkDownBlur(note('# Hello\nsome body'));
  expect(submitted.isEditing).toBe(false);
  expect(submitted.title).toBe('Hello');
  // the heading stays in the content, only the title is derived
  expect(submitted.editor.content).toBe('# Hello\nsome body');
  expect(submitted.note).toBe('# Hello\nsome body');
});

test('non-top or non-H1 headings leave the title alone', () => {
  expect(onMarkDownBlur(note('## Hello')).title).toBe('Markdown Box');
  expect(onMarkDownBlur(note('intro\n# Hello')).title).toBe('Markdown Box');
  expect(onMarkDownBlur(note('#nospace')).title).toBe('Markdown Box');
  expect(onMarkDownBlur(note('')).title).toBe('Markdown Box');
  expect(onMarkDownBlur(note('#   ')).title).toBe('Markdown Box');
  expect(onMarkDownBlur(note('# Hello', 'Custom')).title).toBe('Hello');
});

test('closing hashes are not part of the title', () => {
  expect(onMarkDownBlur(note('# Hello ##')).title).toBe('Hello');
});

test('preview toggle submits the heading as title', () => {
  const updated : Array<NoteState> = [];
  const { container } = render(
    <BoxTopBar
      state={ { ...note('# Hi\nbody'), isEditing : true } }
      isActive={ true }
      removeBox={ () => void 0 }
      updateBoxState={ (box) => { updated.push(box as NoteState); } }
    />
  );
  fireEvent.click(container.querySelector('.markdown-preview') as HTMLElement);
  expect(updated.length).toBe(1);
  expect(updated[0].isEditing).toBe(false);
  expect(updated[0].title).toBe('Hi');
});

test('dark code blocks keep light text on the dark surface', () => {
  // github-markdown-light pins pre text to near-black; the dark
  // overrides must repaint the text, not just the background.
  const css = readFileSync('src/styles/Markdown.css', 'utf8');
  const pre = css.match(/\.dark \.markdown-body pre\s*\{[^}]*\}/)?.[0] ?? '';
  expect(pre).toMatch(/background-color\s*:\s*var\(--raised\)/);
  expect(pre).toMatch(/color\s*:\s*var\(--text\)/);
  const code = css.match(/\.dark \.markdown-body code,[\s\S]*?\}/)?.[0] ?? '';
  expect(code).toMatch(/color\s*:\s*var\(--text\)/);
});
