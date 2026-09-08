import React, { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { saveTourState } from '../Constants'

import '../styles/Tour.css'


export interface TourStep {
  id : string
  title : string
  // Backtick spans render as inline code, so expressions read as
  // expressions instead of dissolving into the sentence.
  body : string
  // CSS selector of the UI the step points at. When it matches a visible
  // element a ring highlights it; otherwise the card simply stands alone,
  // so steps never break on screens where the target is absent.
  target ?: string
  // Same, scoped to the box this run is working with: the ring follows
  // tracked.querySelector(selector), so per-box controls stay addressable.
  targetInTracked ?: string
  // CSS selector of a live control the user may operate mid-step. Clicking
  // it advances the tour to advanceTo just like Next does; pressing Next
  // activates ("clicks") it first, so both paths walk the same road.
  advanceOn ?: string
  // Same, scoped to the tracked box.
  advanceOnInTracked ?: string
  // Where operating advanceOn (or chauffeuring it through Next) walks to.
  advanceTo ?: string
  // The target only resolves once a box exists (the box map hides on an
  // empty notebook): the fresh-render selector sweep skips these, and the
  // conducted walk asserts them against its live box instead.
  needsBox ?: boolean
  // The target lives inside transient UI the tour opens on arrival (the
  // box-type picker, the clearing options, the theme panels): absent in
  // a fresh render by construction, covered by the conducted walk with
  // the panels actually open instead.
  needsPanel ?: boolean
  // Detour steps render the main-path dots parked at the + step.
  branch ?: boolean
  // Park this step's dot on another step (settings cluster, detour).
  dot ?: string
}

// The clickable add-box controls: the big + panel's button on empty
// notebooks, the + row after each box on occupied ones. (Their inert
// wrapper divs are deliberately excluded — "clicking" those opens nothing.)
const ADD_BOX_SELECTOR = '.create-box-plus, .add_box_after'

const LAMBDA_PICK_TITLE = 'Create new λ box'
const LAMBDA_PICK_SELECTOR = `[title="${LAMBDA_PICK_TITLE}"]`
const TYPE_EXPRESSION = '(λ x . x y) a'

// The Debug Step button, ringed alone — never the whole evaluated box.
const STEP_SELECTOR = '.debug-controls--step'

// Per-box controls the tour conducts: the settings gear and its panel,
// the macros dock, and one row hook per box setting.
const GEAR_SELECTOR = '[title="Open this Boxs\' settings"]'
const DELETE_SELECTOR = '[title="Delete this Box from the Notebook"]'
const MACRO_DOCK = '.macro-dock'
const SLI_ROW = '.untyped-lambda-settings-SLI'
const SDE_ROW = '.untyped-lambda-settings-SDE'
const ETA_ROW = '.untyped-lambda-settings-ETA'
const COLLAPSE_ROW = '.untyped-lambda-settings-collapse'
const STRATEGY_ROW = '.untyped-lambda-settings-strategies'

// The top-bar themes control and its panel.
const THEMES_ICON = '[title="Accent theme"]'
const THEMES_PANEL = '.top-bar--accent-pick'

// The zen switch, and the clearing-options eraser with the workspace
// button that marks its open panel.
const ZEN_SELECTOR = '.top-bar--zen'
const CLEAR_SELECTOR = '[title="Clearing options"]'
const CLEAN_WORKSPACE_TITLE = 'Erase all notebooks and start over with the defaults'

// The take-with-you and meta controls closing the tour: notebook
// export, the per-box share-link control, the bug reporter, and the
// walkme icon itself.
const EXPORT_SELECTOR = '[title="Download this Notebook"]'
const SHARE_SELECTOR = '[title="Copy the link to this Expression."]'
const BUG_SELECTOR = '[title="Submit a bug or a feature request"]'
const TOUR_SELECTOR = '[title="Guided tour"]'

// The clearing panel's two exits: Clear notebook is the plain button
// (its title carries the live notebook name), Clean workspace the
// danger one. The theme panel's accent row and box-style tiles.
const CLEAR_NOTEBOOK_SELECTOR = '.top-bar--clear-btn:not(.btn-danger)'
const CLEAN_WORKSPACE_SELECTOR = `[title="${CLEAN_WORKSPACE_TITLE}"]`
const THEME_STYLE_SELECTOR = '.top-bar--boxpreview'

export const TOUR_STEPS : Array<TourStep> = [
  {
    id : 'welcome',
    title : 'Welcome to Lambdulus',
    body : 'A notebook for playing with lambda calculus. Your work lives in notebooks — switch them in the tabs above. This tour takes a minute; skip anytime.',
    target : '.top-bar--tabs',
  },
  {
    id : 'add',
    title : 'Add a box',
    body : 'Boxes are the cells of a notebook. Add one now: click the + affordance — or press Next and I will click it for you.',
    target : ADD_BOX_SELECTOR,
    advanceOn : ADD_BOX_SELECTOR,
    advanceTo : 'pick',
  },
  {
    id : 'pick',
    title : 'Pick a box type',
    body : 'A λ Expression box evaluates lambda calculus step by step. A Markdown box holds notes and docs. Pick λ Expression — the highlighted one — to keep walking with me.',
    target : LAMBDA_PICK_SELECTOR,
    needsPanel : true,
  },
  {
    id : 'type',
    title : 'Write and evaluate',
    body : 'Type `(\\ x . x y) a` into the editor — the backslash becomes λ as you type — then press Debug (Ctrl + Enter). Press Next and I will do it for you.',
  },
  {
    id : 'stepping',
    title : 'Step through evaluation',
    body : 'Evaluated, waiting at its first step. Run walks all the way to the normal form; Step advances once. Try it now — or press `F8` to step, `F9` to run.',
    targetInTracked : STEP_SELECTOR,
  },
  {
    id : 'boxmap',
    title : 'The box map',
    body : 'The strip on the right edge maps every box — click a line to jump to it, or page with `ArrowUp` and `ArrowDown`. The accent bar marks where you are.',
    target : '.box-map',
    needsBox : true,
  },
  {
    id : 'settings',
    title : 'Box settings',
    body : 'Every box carries its own settings, behind this gear. Click it — or press Next and I will — and we will walk each switch.',
    targetInTracked : GEAR_SELECTOR,
    advanceOnInTracked : GEAR_SELECTOR,
    advanceTo : 'set-sli',
  },
  {
    id : 'set-sli',
    title : 'Single Letter Names',
    body : 'Lone letters count as variables, no spaces needed. Flip it and Step again to feel it.',
    targetInTracked : SLI_ROW,
    dot : 'settings',
  },
  {
    id : 'set-sde',
    title : 'Simplified Evaluation',
    body : 'This steers stepping by a different strategy — try the same expression with it on and off.',
    targetInTracked : SDE_ROW,
    dot : 'settings',
  },
  {
    id : 'set-eta',
    title : 'Eta Conversion',
    body : 'Trailing eta-redexes convert at the end when this is on — compare + 1 0 with it off and on.',
    targetInTracked : ETA_ROW,
    dot : 'settings',
  },
  {
    id : 'set-collapse',
    title : 'Collapse Old Steps',
    body : 'This shortens older steps — click any shortened step to expand it again.',
    targetInTracked : COLLAPSE_ROW,
    dot : 'settings',
  },
  {
    id : 'set-strategy',
    title : 'Evaluation Strategies',
    body : 'Normal and Applicative reduce in a different order — run the same expression under each.',
    targetInTracked : STRATEGY_ROW,
    dot : 'settings',
  },
  {
    id : 'macros',
    title : 'Macros',
    body : 'Builtins live here — Y, ZERO, SUC and arithmetic — and `name := …` above the expression defines your own.',
    targetInTracked : MACRO_DOCK,
  },
  {
    id : 'share',
    title : 'Share one box',
    body : 'This link control copies a link that carries exactly this one box — expression, macros and all. Send it to someone and they get this box, not the whole notebook.',
    targetInTracked : SHARE_SELECTOR,
  },
  {
    id : 'zen',
    title : 'Zen mode',
    body : 'One box gets the whole viewport — no siblings, no rails, nothing competing for your eyes. Flip the zen switch up top — or press Next and I will — and feel how quiet calculus gets.',
    target : ZEN_SELECTOR,
    advanceOn : ZEN_SELECTOR,
    advanceTo : 'zen-dwell',
  },
  {
    id : 'zen-dwell',
    title : 'Settle into zen',
    body : 'No sibling boxes, no rails, no panels — just this box and the top bar. Scroll it, keep stepping through the evaluation, feel how quiet calculus gets. When the quiet lands, walk on.',
    dot : 'zen',
  },
  {
    id : 'cleaning',
    title : 'A clean slate',
    body : 'The eraser up top holds both exits — let us walk them one by one. Showing only: your boxes stay exactly where they are.',
    target : CLEAR_SELECTOR,
  },
  {
    id : 'clean-notebook',
    title : 'Clear notebook',
    body : 'Clear notebook empties this notebook — every box goes, the notebook itself stays. Showing only: nothing is pressed behind your back.',
    target : CLEAR_NOTEBOOK_SELECTOR,
    needsPanel : true,
    dot : 'cleaning',
  },
  {
    id : 'clean-workspace',
    title : 'Clean entire workspace',
    body : 'Clean entire workspace restarts everything from the defaults — every notebook, back to a clean slate. Showing only: the box we built stays put, yours to keep.',
    target : CLEAN_WORKSPACE_SELECTOR,
    needsPanel : true,
    dot : 'cleaning',
  },
  {
    id : 'yours',
    title : 'Make it yours',
    body : 'Lambdulus dresses to your taste — the themes panel is open. Two quick walks: accent color first, then box style. Notebook settings, zen mode and export live up here too.',
    target : THEMES_ICON,
  },
  {
    id : 'theme-accent',
    title : 'Accent color',
    body : 'Hover the accent dots — Beta, Lambda, Eta, Alpha — to preview each live across the whole site. Click to keep the one you love.',
    target : THEMES_PANEL,
    needsPanel : true,
    dot : 'yours',
  },
  {
    id : 'theme-style',
    title : 'Box style',
    body : 'The tiles below switch the boxes themselves — Cards or Classic. Hover to preview, click to keep.',
    target : THEME_STYLE_SELECTOR,
    needsPanel : true,
    dot : 'yours',
  },
  {
    id : 'transfer',
    title : 'Import and export',
    body : 'The download arrow exports this notebook to a file — persistent storage for your work. The upload arrow imports such a file back, so notebooks are easy to share with other people.',
    target : EXPORT_SELECTOR,
  },
  {
    id : 'report',
    title : 'Report a bug',
    body : 'If something breaks or misbehaves, the bug icon reports it to the GitHub repo — issues and feature requests both live there.',
    target : BUG_SELECTOR,
  },
  {
    id : 'recap',
    title : 'Walk me again',
    body : 'And if you ever need a recap, here is the walkme again — this icon replays the tour whenever you want it.',
    target : TOUR_SELECTOR,
  },
  {
    id : 'md-explain',
    title : 'A Markdown box',
    body : 'Notes, docs, headings — Markdown boxes hold text, not calculus. Since we came for lambda-calculus, let’s remove this one next — deleting boxes is worth knowing anyway.',
    branch : true,
    dot : 'add',
  },
  {
    id : 'md-delete',
    title : 'Delete a box',
    body : 'Every box deletes from its title-bar controls. Delete this Markdown box now — or press Next and I will do it for you.',
    branch : true,
    dot : 'add',
    targetInTracked : DELETE_SELECTOR,
  },
]

const MAIN_DOTS = [ 'welcome', 'add', 'pick', 'type', 'stepping', 'boxmap', 'settings', 'macros', 'share', 'zen', 'cleaning', 'yours', 'transfer', 'report', 'recap' ]

const BACK : Record<string, string | null> = {
  welcome : null,
  add : 'welcome',
  pick : 'add',
  type : 'pick',
  stepping : 'type',
  boxmap : 'stepping',
  settings : 'boxmap',
  'set-sli' : 'settings',
  'set-sde' : 'set-sli',
  'set-collapse' : 'set-sde',
  'set-strategy' : 'set-collapse',
  macros : 'set-strategy',
  share : 'macros',
  zen : 'share',
  'zen-dwell' : 'zen',
  cleaning : 'zen-dwell',
  'clean-notebook' : 'cleaning',
  'clean-workspace' : 'clean-notebook',
  yours : 'clean-workspace',
  'theme-accent' : 'yours',
  'theme-style' : 'theme-accent',
  transfer : 'theme-style',
  report : 'transfer',
  recap : 'report',
  'md-explain' : 'pick',
  'md-delete' : 'md-explain',
}

const NEXT_MAIN : Record<string, string> = {
  welcome : 'add',
  add : 'pick',
  stepping : 'boxmap',
  boxmap : 'settings',
  settings : 'set-sli',
  'set-sli' : 'set-sde',
  'set-sde' : 'set-collapse',
  'set-collapse' : 'set-strategy',
  'set-strategy' : 'macros',
  macros : 'share',
  share : 'zen',
  zen : 'zen-dwell',
  'zen-dwell' : 'cleaning',
  cleaning : 'clean-notebook',
  'clean-notebook' : 'clean-workspace',
  'clean-workspace' : 'yours',
  yours : 'theme-accent',
  'theme-accent' : 'theme-style',
  'theme-style' : 'transfer',
  transfer : 'report',
  report : 'recap',
  'md-explain' : 'md-delete',
}

function stepById (id : string) : TourStep {
  return TOUR_STEPS.find((step) => step.id === id) ?? TOUR_STEPS[0]
}

function boxKeyOf (element : Element) : string | null {
  return element.closest('[data-box-key]')?.getAttribute('data-box-key') ?? null
}

// Backtick spans become inline code, so the expression a step dictates
// reads as one delimited unit instead of dissolving into the sentence.
function renderBody (body : string) : React.ReactNode {
  return body.split(/(`[^`]+`)/g).map((part : string, index : number) =>
    part.length > 2 && part.startsWith('`') && part.endsWith('`') ?
      <code key={ index } className='tour--code'>{ part.slice(1, -1) }</code>
    :
      part
  )
}


interface Props {
  initialStep : string
  onClose () : void
  onAddLambdaBox () : string | null
  onFillBoxEditor (boxKey : string, content : string) : void
  onSetBoxSettings (boxKey : string, open : boolean) : void
  onShowBoxMacros (boxKey : string) : void
  onHideBoxMacros (boxKey : string) : void
  onDeleteBox (boxKey : string) : void
  onSetZenMode (zenMode : boolean) : void
}

interface Ring {
  top : number
  left : number
  width : number
  height : number
}

export default function Tour (props : Props) : JSX.Element {
  const { initialStep, onClose, onAddLambdaBox, onFillBoxEditor, onSetBoxSettings, onShowBoxMacros, onHideBoxMacros, onDeleteBox, onSetZenMode } : Props = props
  const [ id, setId ] = useState(() => stepById(initialStep).id)
  // The box frame this tour run is working with. Session-only: a reload
  // forgets it, and the wait steps below loop back to 'add' instead of
  // ever touching a stranger's box.
  const [ tracked, setTracked ] = useState<Element | null>(null)
  const [ ring, setRing ] = useState<Ring | null>(null)
  const known = useRef<Set<Element>>(new Set())
  const current : TourStep = stepById(id)
  const last : boolean = id === 'recap'
  const dotIndex : number = MAIN_DOTS.indexOf(current.dot ?? id)

  const goId = (next : string) => {
    if (next === 'add') {
      setTracked(null)
    }

    setId(stepById(next).id)
    saveTourState({ step : stepById(next).id, done : false })
  }

  // Skip: done for now, resume where left off via the icon.
  const snooze = () => {
    saveTourState({ step : id, done : true })
    onClose()
  }

  // Done on the last step: restart from the beginning next time.
  // Done means done — and the finale's clearing panel steps out with
  // the tour, never left open behind it.
  const finish = () => {
    saveTourState({ step : 'welcome', done : true })
    onClose()
    const backdrop : HTMLElement | null = document.querySelector('.top-bar--backdrop')
    if (backdrop !== null) {
      backdrop.click()
    }
  }

  const back = () => {
    const prev : string | null = BACK[id]

    if (prev !== null) {
      goId(prev)
    }
  }

  // Flag marking events the tour dispatches itself, so the document
  // listener below can tell chauffeur mode apart from the user's own hand.
  const CHAUFFEUR = '__tourChauffeur'

  // "Click" a target the way the + affordances listen: the rows open on
  // mousedown, the empty-notebook panel on click. Flagged so the listener
  // opens the control's UI without advancing the tour a second time.
  const activateTarget = (selector : string) : void => {
    const element : Element | null = document.querySelector(selector)

    if (element === null) {
      return
    }

    for (const kind of [ 'mousedown', 'click' ]) {
      const event : MouseEvent & Record<string, boolean> = new MouseEvent(kind, { bubbles : true, cancelable : true }) as MouseEvent & Record<string, boolean>
      event[CHAUFFEUR] = true
      element.dispatchEvent(event)
    }
  }

  // Interactive step: operating the control advances just like Next.
  // Capture phase, so no stopPropagation inside the app can swallow it.
  // There is no dim and no blocking step anymore — the whole page stays
  // visibly clickable, so "live" is not a step property but the default.
  useEffect(() => {
    const docSel : string | undefined = current.advanceOn
    const scopedSel : string | undefined = current.advanceOnInTracked

    if (docSel === undefined && scopedSel === undefined) {
      return
    }

    const target : string = current.advanceTo ?? id
    const onActivate = (e : Event) => {
      if ((e as Event & Record<string, boolean>)[CHAUFFEUR] === true) {
        return
      }

      const el : Element | null = e.target as Element | null

      if (el === null || el.closest === undefined) {
        return
      }

      if (docSel !== undefined && el.closest(docSel) !== null) {
        goId(target)
        return
      }

      if (scopedSel !== undefined && tracked !== null && tracked.isConnected) {
        const hit : Element | null = el.closest(scopedSel)

        if (hit !== null && tracked.contains(hit)) {
          goId(target)
        }
      }
    }

    document.addEventListener('mousedown', onActivate, true)
    document.addEventListener('click', onActivate, true)

    return () => {
      document.removeEventListener('mousedown', onActivate, true)
      document.removeEventListener('click', onActivate, true)
    }
  }, [ id, current.advanceOn, current.advanceOnInTracked, tracked ])

  // Branch routing: watch the app for the boxes this run creates, evaluates
  // or deletes, and walk on when the real thing happens. The detour watches
  // from its explainer already, so deleting early advances at once instead
  // of stranding the user on a step about a box that is gone.
  useEffect(() => {
    if (id === 'pick') {
      known.current = new Set([ ...document.querySelectorAll('.box-frame') ])

      const check = () => {
        for (const frame of document.querySelectorAll('.box-frame')) {
          if (known.current.has(frame)) {
            continue
          }

          known.current.add(frame)

          if (frame.querySelector('.untypedLambdaBox') !== null) {
            setTracked(frame)
            goId('type')
            return
          }

          if (frame.querySelector('.markDownBox') !== null) {
            setTracked(frame)
            goId('md-explain')
            return
          }

          // Unknown box type: watched, but never routed on.
        }
      }

      check()
      const observer = new MutationObserver(check)
      observer.observe(document.body, { childList : true, subtree : true })

      return () => observer.disconnect()
    }

    if (id === 'type' || id === 'md-delete' || id === 'md-explain') {
      if (tracked === null || !tracked.isConnected) {
        goId('add')
        return
      }

      const check = () => {
        if (!tracked.isConnected) {
          goId('add')
          return
        }

        // A submitted box renders its history; an empty one only the editor.
        if (id === 'type' && tracked.querySelector('.box-history-wrap') !== null) {
          goId('stepping')
        }
      }

      check()
      const observer = new MutationObserver(check)
      observer.observe(document.body, { childList : true, subtree : true })

      return () => observer.disconnect()
    }

    return undefined
  }, [ id ])

  // Show, don't tell: the macros and themes steps open the real panels on
  // arrival, so the tour points at living UI instead of describing it.
  // The macros arrival is one atomic handoff — settings closed, dock
  // open — because two programmatic toggles would read stale props and
  // resurrect each other through the box replace. Setting values, never
  // toggling, so an already-open dock simply stays open.
  useEffect(() => {
    if (id === 'macros' && tracked !== null && tracked.isConnected) {
      const boxKey : string | null = boxKeyOf(tracked)

      if (boxKey !== null) {
        onShowBoxMacros(boxKey)
      }
    }

    // The themes walk re-opens its panel whenever a step lands without
    // it — backing in from later steps replaces panels, so the accent
    // row and tiles would otherwise point at nothing.
    if ((id === 'yours' || id === 'theme-accent' || id === 'theme-style') && document.querySelector(THEMES_PANEL) === null) {
      (document.querySelector(THEMES_ICON) as HTMLElement | null)?.click()
    }

    // Entering zen declutters first: any open top-bar panel steps out
    // with the rest of the furniture, so the quiet lands at once.
    if (id === 'zen') {
      (document.querySelector('.top-bar--backdrop') as HTMLElement | null)?.click()
    }

    // The finale only shows: open the clearing options so both exits
    // read live, but press neither — the boxes stay put. Same re-open
    // for the exit sub-steps, for the same backing-in reason as themes.
    if ((id === 'cleaning' || id === 'clean-notebook' || id === 'clean-workspace') && document.querySelector(`[title="${CLEAN_WORKSPACE_TITLE}"]`) === null) {
      (document.querySelector(CLEAR_SELECTOR) as HTMLElement | null)?.click()
    }

    // Stepping on to take-with-you closes the themes panel behind us —
    // its rows would otherwise linger over the export and import icons.
    if (id === 'transfer') {
      (document.querySelector('.top-bar--backdrop') as HTMLElement | null)?.click()
    }
  }, [ id ])

  const chauffeurPickLambda = () => {
    // Prefer the open picker (same road as the hand); fall back to state
    // when the modal is nowhere to be found. Either way the pick watcher
    // above routes on the new box.
    const option : Element | null = document.querySelector(`[title="${LAMBDA_PICK_TITLE}"]`)

    if (option !== null) {
      (option as HTMLElement).click()
      return
    }

    onAddLambdaBox()
  }

  const chauffeurTypeAndDebug = () => {
    if (tracked === null || !tracked.isConnected) {
      goId('add')
      return
    }

    const boxKey : string | null = boxKeyOf(tracked)

    if (boxKey === null) {
      goId('add')
      return
    }

    // Flush first: the Debug submit below reads the box from the committed
    // render, so filling without flushing would submit the stale content.
    flushSync(() => onFillBoxEditor(boxKey, TYPE_EXPRESSION))
    tracked.querySelector('.open-as-debug')?.dispatchEvent(
      new MouseEvent('click', { bubbles : true, cancelable : true })
    )
  }

  const chauffeurGear = () => {
    if (tracked === null || !tracked.isConnected) {
      goId('add')
      return
    }

    const boxKey : string | null = boxKeyOf(tracked)

    if (boxKey === null) {
      goId('add')
      return
    }

    // Explicit value through state, not the gear toggle: the title bar only
    // re-renders on box commits, so a programmatic toggle would read stale
    // props whenever the bar skipped a render. The user's own hand still
    // works the real gear (it commits, then re-renders, then is fresh).
    onSetBoxSettings(boxKey, true)
    goId('set-sli')
  }

  const chauffeurDelete = () => {
    if (tracked === null || !tracked.isConnected) {
      goId('add')
      return
    }

    const boxKey : string | null = boxKeyOf(tracked)

    if (boxKey === null) {
      goId('add')
      return
    }

    onDeleteBox(boxKey)
  }

  // Explicit zen value through state, never the switch toggle: working
  // the toggle programmatically would flip an already-zen notebook
  // back out. The user's own hand still works the real switch (and
  // the advance listener walks on from it, same destination).
  const chauffeurZen = () => {
    onSetZenMode(true)
    goId('zen-dwell')
  }

  const next = () => {
    // The zen step carries a document advanceOn for the user's hand,
    // but Next must set — never toggle — so it chauffeurs past the
    // generic activate-target road above, same destination.
    if (id === 'zen') {
      chauffeurZen()
      return
    }

    // Chauffeur mode on the + step: work the control ourselves (its flagged
    // events open the picker's UI but never advance), then walk on once.
    if (current.advanceOn !== undefined) {
      activateTarget(current.advanceOn)
      goId(current.advanceTo ?? id)
      return
    }

    switch (id) {
      case 'pick':
        chauffeurPickLambda()
        return
      case 'type':
        chauffeurTypeAndDebug()
        return
      case 'settings':
        chauffeurGear()
        return
      case 'md-delete':
        chauffeurDelete()
        return
      case 'macros': {
        // Demonstrated, now out of the way: collapse the dock before
        // share, so the next step never starts obstructed. The want
        // survives for Back; zen forgets it right after.
        const boxKey : string | null = tracked !== null && tracked.isConnected ? boxKeyOf(tracked) : null

        if (boxKey !== null) {
          onHideBoxMacros(boxKey)
        }

        goId(NEXT_MAIN[id] ?? id)
        return
      }
      case 'recap':
        finish()
        return
      default:
        goId(NEXT_MAIN[id] ?? id)
    }
  }

  // Seating on init and every step change — start, resume or walk-on:
  // the tour conducts from the top of its subject, so a scrolled page
  // (or boxes seated above the tour's own) can never leave the card
  // pointing off-screen. Only subjects actually out of view move — under
  // the fixed bar or off the fold; anything visible stays exactly where
  // the user put it. Seated below the fixed top bar, mirroring the
  // notebook's own focus seating (60 normal, 76 zen, same 2px hush).
  useEffect(() => {
    const subject : Element | null =
      (
        tracked !== null && tracked.isConnected && current.targetInTracked !== undefined ?
          tracked.querySelector(current.targetInTracked)
        :
          null
      )
      ?? (current.target !== undefined ? document.querySelector(current.target) : null)
      ?? (tracked !== null && tracked.isConnected ? tracked : null)
      ?? document.querySelector('.box-frame')

    if (subject === null) {
      return
    }

    const rect : DOMRect = subject.getBoundingClientRect()

    if (rect.width === 0 && rect.height === 0) {
      return
    }

    const seat : number = document.querySelector('.mainSpace.zen') === null ? 60 : 76

    if (rect.top < seat - 2 || rect.bottom < seat || rect.top > window.innerHeight - 2) {
      window.scrollTo({ top : Math.max(window.scrollY + rect.top - seat, 0), behavior : 'auto' })
    }
  }, [ id, tracked ])

  useEffect(() => {
    setRing(null)

    const element : Element | null =
      current.targetInTracked !== undefined ?
        (tracked !== null && tracked.isConnected ? tracked.querySelector(current.targetInTracked) : null)
      : current.target !== undefined ?
        document.querySelector(current.target)
      :
        null

    if (element === null) {
      return
    }

    // The ring re-seats on resize, scroll, the element's own growth — a
    // stepping box grows under it — and any DOM arrival: panels the tour
    // itself opens (macros dock, clearing and theme options) land after
    // this effect runs, so without the observer their rings would never
    // appear. The rect guard keeps the observer from re-rendering on
    // unrelated mutations.
    let lastKey : string | null = null

    const place = () => {
      const rect : DOMRect = element.getBoundingClientRect()
      const key : string =
        rect.width === 0 && rect.height === 0 ?
          'null'
        :
          [ rect.top, rect.left, rect.width, rect.height ].map((n : number) => Math.round(n)).join(',')

      if (key === lastKey) {
        return
      }

      lastKey = key
      setRing(key === 'null' ? null : { top : rect.top, left : rect.left, width : rect.width, height : rect.height })
    }

    place()

    const ro : ResizeObserver | null =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)

    ro?.observe(element)
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    const mo : MutationObserver = new MutationObserver(place)
    mo.observe(document.body, { childList : true, subtree : true })

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
      mo.disconnect()
    }
  }, [ id, tracked ])

  return (
    <div className='tour'>
      {
        ring !== null ?
          <div
            className='tour--ring'
            aria-hidden='true'
            style={ {
              top : ring.top - 6,
              left : ring.left - 6,
              width : ring.width + 12,
              height : ring.height + 12,
            } }
          />
        :
          null
      }
      <div className='tour--card' role='dialog' aria-label={ `Guided tour: ${current.title}` }>
        <p className='tour--kicker'>
          {
            current.branch === true ?
              'Guided tour · Markdown detour'
            :
              `Guided tour · ${dotIndex + 1} of ${MAIN_DOTS.length}`
          }
        </p>
        <p className='tour--title'>{ current.title }</p>
        <p className='tour--body'>{ renderBody(current.body) }</p>
        <div className='tour--dots' aria-hidden='true'>
          {
            MAIN_DOTS.map((dot : string) =>
              <span key={ dot } className={ MAIN_DOTS[dotIndex] === dot ? 'tour--dot tour--dot--active' : 'tour--dot' } />
            )
          }
        </div>
        <div className='tour--actions'>
          {
            BACK[id] !== null ?
              <button className='tour--btn' onClick={ back }>Back</button>
            :
              <span />
          }
          <button className='tour--btn' onClick={ snooze }>Skip</button>
          {
            last ?
              <button className='tour--btn tour--btn--primary' onClick={ next }>Done</button>
            :
              <button className='tour--btn tour--btn--primary' onClick={ next }>Next</button>
          }
        </div>
      </div>
    </div>
  )
}
