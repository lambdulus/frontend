// Privacy-friendly visitor counting via Plausible (EU-hosted, cookieless,
// no personal data, no cross-site tracking). Page views are counted
// automatically; interaction counts go through trackEvent with string
// aggregate properties only -- never user content, never an identifier.
//
// Tracking runs on the production site only: the same build also serves
// /staging and /staging/pr/*, and developers run on localhost. Do Not
// Track is respected.
//
// Setup: add a Plausible site for PLAUSIBLE_DOMAIN, then create custom
// event goals named `submit_expression` and `open_bug_report` -- goals
// are what make custom events (and their property breakdowns) appear.

export const PLAUSIBLE_DOMAIN = 'lambdulus.github.io'
export const PRODUCTION_HOST = 'lambdulus.github.io'

export type EventProps = Record<string, string>

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

let initialized = false

// The optional override is an escape hatch for tests and for a future
// settings toggle; production code calls this with no arguments.
export function initAnalytics (enabled : boolean = isTrackingEnabled()) : void {
  if (initialized || !enabled || typeof document === 'undefined') {
    return
  }
  initialized = true

  const script : HTMLScriptElement = document.createElement('script')
  script.defer = true
  script.setAttribute('data-domain', PLAUSIBLE_DOMAIN)
  script.src = 'https://plausible.io/js/script.js'
  document.head.appendChild(script)
}

// Aggregate interaction counting. Silently drops when the Plausible
// snippet is absent (staging, localhost, blocked scripts), so partial
// environments never emit partial data.
export function trackEvent (name : string, props : EventProps = {}) : void {
  try {
    const plausible : unknown = (window as unknown as Record<string, unknown>).plausible
    if (typeof plausible !== 'function') {
      return
    }
    (plausible as (name : string, options : { props : EventProps }) => void)(name, { props })
  }
  catch {
    // Analytics must never break the app.
  }
}
