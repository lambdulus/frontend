import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// @monaco-editor/react needs a browser + web workers; tests get a stub.
// The bare 'monaco-editor' import is stubbed too - parts of it ship syntax
// esbuild cannot transform in isolation.
vi.mock('@monaco-editor/react', () => ({
  __esModule: true,
  default: (props : { value ?: string }) => null,
  loader: { config: vi.fn() },
}))
vi.mock('monaco-editor', () => ({
  editor: { defineTheme: vi.fn() },
}))

// jsdom does not implement URL.createObjectURL (used by TopBar to offer the
// notebook download). A stub returning a fake blob URL is enough for tests.
if (typeof window.URL.createObjectURL !== 'function') {
  window.URL.createObjectURL = vi.fn(() : string => 'blob:mock-url')
}
