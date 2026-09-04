// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// jsdom does not implement URL.createObjectURL (used by TopBar to offer the
// notebook download). A stub returning a fake blob URL is enough for tests.
if (typeof window.URL.createObjectURL !== 'function') {
  window.URL.createObjectURL = jest.fn(() : string => 'blob:mock-url');
}
