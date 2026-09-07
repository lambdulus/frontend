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
  // Ring the box this tour run is working with instead of a selector.
  ringTracked ?: boolean
  // The target only resolves once a box exists (the box map hides on an
  // empty notebook): the fresh-render selector sweep skips these, and the
  // conducted walk asserts them against its live box instead.
  needsBox ?: boolean
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
const TYPE_EXPRESSION = '(λ x . x y) a'

// Per-box controls the tour conducts: the settings gear and its panel,
// the macros dock, and one row hook per box setting.
const GEAR_SELECTOR = '[title="Open this Boxs\' settings"]'
const MACRO_DOCK = '.macro-dock'
const SLI_ROW = '.untyped-lambda-settings-SLI'
const SDE_ROW = '.untyped-lambda-settings-SDE'
const COLLAPSE_ROW = '.untyped-lambda-settings-collapse'
const STRATEGY_ROW = '.untyped-lambda-settings-strategies'

// The top-bar themes control and its panel.
const THEMES_ICON = '[title="Accent theme"]'
const THEMES_PANEL = '.top-bar--accent-pick'

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
    body : 'A λ Expression box evaluates lambda calculus step by step. A Markdown box holds notes and docs. Pick λ Expression to keep walking with me.',
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
    ringTracked : true,
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
    id : 'yours',
    title : 'Make it yours',
    body : 'The themes panel is open — hover the accent dots or box-style tiles to preview them live, click to keep. Notebook settings, zen mode and export live up here too.',
    target : THEMES_ICON,
  },
  {
    id : 'md-explain',
    title : 'A Markdown box',
    body : 'Notes, docs, headings — Markdown boxes hold text, not calculus. Since we came for lambda, let’s remove this one next — deleting boxes is worth knowing anyway.',
    branch : true,
    dot : 'add',
  },
  {
    id : 'md-delete',
    title : 'Delete a box',
    body : 'Every box deletes from its title-bar controls. Delete this Markdown box now — or press Next and I will do it for you.',
    branch : true,
    dot : 'add',
    ringTracked : true,
  },
]

const MAIN_DOTS = [ 'welcome', 'add', 'pick', 'type', 'stepping', 'boxmap', 'settings', 'macros', 'yours' ]

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
  yours : 'macros',
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
  macros : 'yours',
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
  onDeleteBox (boxKey : string) : void
}

interface Ring {
  top : number
  left : number
  width : number
  height : number
}

export default function Tour (props : Props) : JSX.Element {
  const { initialStep, onClose, onAddLambdaBox, onFillBoxEditor, onSetBoxSettings, onShowBoxMacros, onDeleteBox } : Props = props
  const [ id, setId ] = useState(() => stepById(initialStep).id)
  // The box frame this tour run is working with. Session-only: a reload
  // forgets it, and the wait steps below loop back to 'add' instead of
  // ever touching a stranger's box.
  const [ tracked, setTracked ] = useState<Element | null>(null)
  const [ ring, setRing ] = useState<Ring | null>(null)
  const known = useRef<Set<Element>>(new Set())
  const current : TourStep = stepById(id)
  const last : boolean = id === 'yours'
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
  const finish = () => {
    saveTourState({ step : 'welcome', done : true })
    onClose()
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

    if (id === 'yours' && document.querySelector(THEMES_PANEL) === null) {
      (document.querySelector(THEMES_ICON) as HTMLElement | null)?.click()
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

  const next = () => {
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
      case 'yours':
        finish()
        return
      default:
        goId(NEXT_MAIN[id] ?? id)
    }
  }

  useEffect(() => {
    setRing(null)

    const element : Element | null =
      current.ringTracked === true ?
        (tracked !== null && tracked.isConnected ? tracked : null)
      : current.targetInTracked !== undefined ?
        (tracked !== null && tracked.isConnected ? tracked.querySelector(current.targetInTracked) : null)
      : current.target !== undefined ?
        document.querySelector(current.target)
      :
        null

    if (element === null) {
      return
    }

    // The ring re-seats on resize, scroll and the element's own growth —
    // a stepping box grows under it — so the highlight never lags behind.
    const place = () => {
      const rect : DOMRect = element.getBoundingClientRect()

      if (rect.width === 0 && rect.height === 0) {
        setRing(null)
        return
      }

      setRing({ top : rect.top, left : rect.left, width : rect.width, height : rect.height })
    }

    place()

    const ro : ResizeObserver | null =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(place)

    ro?.observe(element)
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)

    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
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
