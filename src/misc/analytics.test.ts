import { test, expect, afterEach, vi } from 'vitest'

import { getAnalyticsSessionId, isTrackingEnabled } from './analytics'

afterEach(() => {
  vi.resetModules()
})

test('session id is stable within the tab session', () => {
  expect(getAnalyticsSessionId()).toBe(getAnalyticsSessionId())
  expect(getAnalyticsSessionId().length).toBeGreaterThan(0)
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
  expect(document.querySelector('script[src*="googletagmanager.com/gtag/js"]')).toBeNull()
})

test('events are dropped until tracking initializes', async () => {
  const { trackEvent } = await import('./analytics')
  trackEvent('submit_expression', { status : 'valid' })
  expect((window as unknown as Record<string, unknown>).dataLayer).toBeUndefined()
})

test('events carry the session id once initialized', async () => {
  const { initAnalytics, trackEvent, getAnalyticsSessionId } = await import('./analytics')
  initAnalytics(true)
  trackEvent('submit_expression', { status : 'valid' })

  const dataLayer : Array<unknown> = (window as unknown as Record<string, unknown>).dataLayer as Array<unknown>
  const events : Array<Array<unknown>> = dataLayer.filter(
    (entry : unknown) : entry is Array<unknown> => Array.isArray(entry) && entry[0] === 'event'
  )
  expect(events).toHaveLength(1)

  const params : Record<string, unknown> = events[0][2] as Record<string, unknown>
  expect(params.status).toBe('valid')
  expect(params.app_session_id).toBe(getAnalyticsSessionId())

  for (const script of Array.from(document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]'))) {
    script.remove()
  }
  delete (window as unknown as Record<string, unknown>).dataLayer
  delete (window as unknown as Record<string, unknown>).gtag
})

test('eventPreview is a short single line', async () => {
  const { eventPreview } = await import('./analytics')
  expect(eventPreview('(\nXx.  x\n)')).toBe('( Xx. x )')
  expect(eventPreview('x'.repeat(200))).toHaveLength(100)
})

test('init injects the gtag snippet exactly once', async () => {
  const { initAnalytics } = await import('./analytics')
  initAnalytics(true)
  initAnalytics(true)

  const scripts : Array<HTMLScriptElement> = Array.from(
    document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]')
  )
  expect(scripts).toHaveLength(1)
  expect(scripts[0].src).toContain('id=G-QWLM9KLGNC')
  expect(scripts[0].async).toBe(true)

  const dataLayer : unknown = (window as unknown as Record<string, unknown>).dataLayer
  expect(Array.isArray(dataLayer)).toBe(true)

  for (const script of scripts) {
    script.remove()
  }
  delete (window as unknown as Record<string, unknown>).dataLayer
  delete (window as unknown as Record<string, unknown>).gtag
})
