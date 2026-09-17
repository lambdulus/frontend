import { test, expect, afterEach, vi } from 'vitest'

import { isTrackingEnabled } from './analytics'

afterEach(() => {
  vi.resetModules()
  for (const script of Array.from(document.querySelectorAll('script[src*="plausible.io"]'))) {
    script.remove()
  }
  delete (window as unknown as Record<string, unknown>).plausible
})

test('tracking runs on the production site only', () => {
  const prod = { hostname : 'lambdulus.github.io', pathname : '/', doNotTrack : null }
  expect(isTrackingEnabled(prod)).toBe(true)
  expect(isTrackingEnabled({ ...prod, pathname : '/index.html' })).toBe(true)

  expect(isTrackingEnabled({ ...prod, pathname : '/staging' })).toBe(false)
  expect(isTrackingEnabled({ ...prod, pathname : '/staging/pr/feature-x' })).toBe(false)
  expect(isTrackingEnabled({ hostname : 'localhost', pathname : '/', doNotTrack : null })).toBe(false)
  expect(isTrackingEnabled({ ...prod, doNotTrack : '1' })).toBe(false)
})

test('init is a no-op where tracking is disabled', async () => {
  // jsdom defaults to http://localhost:3000/ so the production gate fails.
  const { initAnalytics } = await import('./analytics')
  initAnalytics()
  expect(document.querySelector('script[src*="plausible.io"]')).toBeNull()
})

test('init injects the Plausible snippet exactly once', async () => {
  const { initAnalytics } = await import('./analytics')
  initAnalytics(true)
  initAnalytics(true)

  const scripts : Array<HTMLScriptElement> = Array.from(
    document.querySelectorAll('script[src*="plausible.io"]')
  )
  expect(scripts).toHaveLength(1)
  expect(scripts[0].src).toBe('https://plausible.io/js/script.js')
  expect(scripts[0].defer).toBe(true)
  expect(scripts[0].getAttribute('data-domain')).toBe('lambdulus.github.io')
})

test('events are dropped when the snippet is absent', async () => {
  const { trackEvent } = await import('./analytics')
  expect(() => trackEvent('submit_expression', { status : 'valid' })).not.toThrow()
})

test('events forward aggregate props to Plausible', async () => {
  const calls : Array<{ name : string, options : { props : Record<string, string> } }> = []
  const scope : Record<string, unknown> = window as unknown as Record<string, unknown>
  scope.plausible = (name : string, options : { props : Record<string, string> }) : void => {
    calls.push({ name, options })
  }

  const { trackEvent } = await import('./analytics')
  trackEvent('submit_expression', { source : 'editor', status : 'valid' })

  expect(calls).toHaveLength(1)
  expect(calls[0].name).toBe('submit_expression')
  expect(calls[0].options.props).toEqual({ source : 'editor', status : 'valid' })
})
