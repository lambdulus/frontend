import React from 'react';
import { test, expect } from 'vitest';
import { render } from '@testing-library/react';
import App from './App';

test('renders the app shell (top-level smoke test)', () => {
  const { getByText } = render(<App />);
  // #bad-screen-message is always rendered by App, independent of screen state
  const message = getByText(/Lambdulus only runs on screens at least 900 pixels wide\./i);
  expect(message).toBeInTheDocument();
});
