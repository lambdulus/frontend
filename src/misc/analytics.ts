// GA4 visitor tracking plus the per-tab session id that bug reports
// carry, so a filed issue can be matched to its analytics events.
// Filter Explore by the event parameter `app_session_id` (register it
// under Admin -> Custom definitions -> Custom dimensions first).
//
// Tracking runs on the production site only: the same build also serves
// /staging and /staging/pr/*, and developers run on localhost. Do Not
// Track is respected. No expression contents or other user data are sent.

export const GA_MEASUREMENT_ID = 'G-QWLM9KLGNC'
export const PRODUCTION_HOST = 'lambdulus.github.io'
export const SESSION_ID_PARAM = 'app_session_id'

// GA4 truncates event parameter values at 100 characters.
export const EVENT_PREVIEW_LENGTH = 100

export type EventParams = Record<string, string | number | boolean>

const SESSION_STORAGE_KEY = 'lambdulus.analyticsSessionId'

let memorySessionId : string | null = null
let initialized = false

function newSessionId () : string {
  try {
    const id : string | undefined = globalThis.crypto?.randomUUID?.()
    if (typeof id === 'string' && id.length > 0) {
      return id
    }
  }
  catch {
    // Fall through to the Math.random fallback below.
  }
  return `${ Date.now().toString(36) }-${ Math.random().toString(36).slice(2) }`
}

// One id per tab session: a fresh tab starts a fresh replayable session,
// while reloads and in-app navigation keep the same one.
export function getAnalyticsSessionId () : string {
  if (typeof window === 'undefined') {
    memorySessionId ??= newSessionId()
    return memorySessionId as string
  }

  try {
    const stored : string | null = window.sessionStorage.getItem(SESSION_STORAGE_KEY)
    if (stored !== null && stored.length > 0) {
      return stored
    }
    const fresh : string = newSessionId()
    window.sessionStorage.setItem(SESSION_STORAGE_KEY, fresh)
    return fresh
  }
  catch {
    memorySessionId ??= newSessionId()
    return memorySessionId as string
  }
}

export interface TrackingContext {
  hostname : string
  pathname : string
  doNotTrack : string | null
}

function currentContext () : TrackingContext {
  return {
    hostname : window.location.hostname,
    pathname : window.location.pathname,
    doNotTrack : window.navigator.doNotTrack ?? null,
  }
}

export function isTrackingEnabled (context : TrackingContext = currentContext()) : boolean {
  if (context.doNotTrack === '1') {
    return false
  }
  if (context.hostname !== PRODUCTION_HOST) {
    return false
  }
  return context.pathname === '/' || context.pathname === '/index.html'
}

function loadGtag () : void {
  const scope : Record<string, unknown> = window as unknown as Record<string, unknown>

  const dataLayer : Array<unknown> = Array.isArray(scope.dataLayer)
    ? scope.dataLayer as Array<unknown>
    : []
  scope.dataLayer = dataLayer

  // The gtag stub queues commands until the real library arrives,
  // mirroring the snippet from the Google Analytics admin.
  scope.gtag = function (...args : Array<unknown>) : void {
    dataLayer.push(args)
  }

  const gtag : (...args : Array<unknown>) => void = scope.gtag as (...args : Array<unknown>) => void
  gtag('js', new Date())
  gtag('set', { [SESSION_ID_PARAM] : getAnalyticsSessionId() })
  gtag('config', GA_MEASUREMENT_ID)

  const script : HTMLScriptElement = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ GA_MEASUREMENT_ID }`
  document.head.appendChild(script)
}

// The optional override is an escape hatch for tests and for a future
// settings toggle; production code calls this with no arguments.
export function initAnalytics (enabled : boolean = isTrackingEnabled()) : void {
  if (initialized || !enabled) {
    return
  }
  initialized = true
  loadGtag()
}

// Single-line preview of user content for event parameters. Only a prefix
// travels to analytics; the full text stays in the bug report, which the
// user reviews before sending.
export function eventPreview (text : string) : string {
  return text.replace(/\s+/g, ' ').slice(0, EVENT_PREVIEW_LENGTH)
}

// Interaction events for session replay (Explore filtered by
// `app_session_id`). Drops silently unless tracking initialized, so
// staging, localhost, and ad-blocked sessions never emit partial data.
export function trackEvent (name : string, params : EventParams = {}) : void {
  if (!initialized) {
    return
  }
  try {
    const gtag : unknown = (window as unknown as Record<string, unknown>).gtag
    if (typeof gtag !== 'function') {
      return
    }
    (gtag as (...args : Array<unknown>) => void)('event', name, {
      ...params,
      [SESSION_ID_PARAM] : getAnalyticsSessionId(),
    })
  }
  catch {
    // Analytics must never break the app.
  }
}
