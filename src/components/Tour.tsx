import React, { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'

import { saveTourState } from '../Constants'

import '../styles/Tour.css'


export interface TourStep {
  id : string
  title : string
  body : string
  // CSS selector of the UI the step points at. When it matches a visible
  // element a ring highlights it; otherwise the card simply stands alone,
  // so steps never break on screens where the target is absent.
  target ?: string
  // CSS selector of a live control the user may operate mid-step. Clicking
  // it advances the tour just like Next does; pressing Next activates
  // ("clicks") it first, so both paths walk the same road.
  advanceOn ?: string
  // Ring the box this tour run is working with instead of a selector.
  ringTracked ?: boolean
  // Detour steps render the main-path dots parked at the + step.
  branch ?: boolean
}

// The add-box affordance differs by notebook state: an empty notebook shows
// the big + panel, an occupied one a + row after each box.
const ADD_BOX_SELECTOR = '.top-level--create-box, .add_box_after, .create-box-plus'

const LAMBDA_PICK_TITLE = 'Create new λ box'
const TYPE_EXPRESSION = '(λ x . x y) a'

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
  },
  {
    id : 'pick',
    title : 'Pick a box type',
    body : 'A λ Expression box evaluates lambda calculus step by step. A Markdown box holds notes and docs. Pick λ Expression to keep walking with me.',
  },
  {
    id : 'type',
    title : 'Write and evaluate',
    body : 'Type (\\ x . x y) a into the editor — the backslash becomes λ as you type — then press Debug (Ctrl + Enter). Press Next and I will do it for you.',
  },
  {
    id : 'stepping',
    title : 'Step through evaluation',
    body : 'There it is — evaluated and waiting at its first step. Run walks all the way to the normal form, Step advances once — try it now. A box\u2019s settings switch the strategy (normal, applicative…), toggle single-letter variables, and expand standalones.',
    ringTracked : true,
  },
  {
    id : 'macros',
    title : 'Macros',
    body : 'Church numerals, booleans and arithmetic (Y, ZERO, SUC, +, *) are builtin. Your own definitions unfold in the Macros dock beside each box.',
  },
  {
    id : 'yours',
    title : 'Make it yours',
    body : 'Hover the accent dots or box-style tiles to preview them live across the whole page — click to keep. The top bar also holds notebook settings, zen mode, and export.',
    target : '[title="Accent theme"]',
  },
  {
    id : 'md-explain',
    title : 'A Markdown box',
    body : 'Notes, docs, headings — Markdown boxes hold text, not calculus. Since we came for lambda, let\u2019s remove this one next — deleting boxes is worth knowing anyway.',
    branch : true,
  },
  {
    id : 'md-delete',
    title : 'Delete a box',
    body : 'Every box deletes from its title-bar controls. Delete this Markdown box now — or press Next and I will do it for you.',
    branch : true,
    ringTracked : true,
  },
]

const MAIN_DOTS = [ 'welcome', 'add', 'pick', 'type', 'stepping', 'macros', 'yours' ]

const BACK : Record<string, string | null> = {
  welcome : null,
  add : 'welcome',
  pick : 'add',
  type : 'pick',
  stepping : 'type',
  macros : 'stepping',
  yours : 'macros',
  'md-explain' : 'pick',
  'md-delete' : 'md-explain',
}

const NEXT_MAIN : Record<string, string> = {
  welcome : 'add',
  add : 'pick',
  stepping : 'macros',
  macros : 'yours',
  'md-explain' : 'md-delete',
}

function stepById (id : string) : TourStep {
  return TOUR_STEPS.find((step) => step.id === id) ?? TOUR_STEPS[0]
}

function boxKeyOf (element : Element) : string | null {
  return element.closest('[data-box-key]')?.getAttribute('data-box-key') ?? null
}


interface Props {
  initialStep : string
  onClose () : void
  onAddLambdaBox () : string | null
  onFillBoxEditor (boxKey : string, content : string) : void
  onDeleteBox (boxKey : string) : void
}

interface Ring {
  top : number
  left : number
  width : number
  height : number
}

export default function Tour (props : Props) : JSX.Element {
  const { initialStep, onClose, onAddLambdaBox, onFillBoxEditor, onDeleteBox } : Props = props
  const [ id, setId ] = useState(() => stepById(initialStep).id)
  // The box frame this tour run is working with. Session-only: a reload
  // forgets it, and the wait steps below loop back to 'add' instead of
  // ever touching a stranger's box.
  const [ tracked, setTracked ] = useState<Element | null>(null)
  const [ ring, setRing ] = useState<Ring | null>(null)
  const known = useRef<Set<Element>>(new Set())
  const current : TourStep = stepById(id)
  const last : boolean = id === 'yours'
  const dotIndex : number = current.branch === true ? MAIN_DOTS.indexOf('add') : MAIN_DOTS.indexOf(id)

  const goId = (next : string) => {
    if (next === 'add') {
      setTracked(null)
    }

    setId(stepById(next).id)
    saveTourState({ step : stepById(next).id, done : false })
  }

  // Skip (or backdrop): done for now, resume where left off via the icon.
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
  useEffect(() => {
    if (current.advanceOn === undefined) {
      return
    }

    const selector : string = current.advanceOn
    const onActivate = (e : Event) => {
      if ((e as Event & Record<string, boolean>)[CHAUFFEUR] === true) {
        return
      }

      if ((e.target as Element | null)?.closest?.(selector) != null) {
        goId(MAIN_DOTS[MAIN_DOTS.indexOf(id) + 1] ?? id)
      }
    }

    document.addEventListener('mousedown', onActivate, true)
    document.addEventListener('click', onActivate, true)

    return () => {
      document.removeEventListener('mousedown', onActivate, true)
      document.removeEventListener('click', onActivate, true)
    }
  }, [ id, current.advanceOn ])

  // Branch routing: watch the app for the boxes this run creates, evaluates
  // or deletes, and walk on when the real thing happens.
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

    if (id === 'type' || id === 'md-delete') {
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
      goId(NEXT_MAIN[id] ?? id)
      return
    }

    switch (id) {
      case 'pick':
        chauffeurPickLambda()
        return
      case 'type':
        chauffeurTypeAndDebug()
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
      : current.target !== undefined ?
        document.querySelector(current.target)
      :
        null

    if (element === null) {
      return
    }

    const rect : DOMRect = element.getBoundingClientRect()

    if (rect.width === 0 && rect.height === 0) {
      return
    }

    setRing({ top : rect.top, left : rect.left, width : rect.width, height : rect.height })
  }, [ id, tracked ])

  return (
    <div className={ current.advanceOn !== undefined ? 'tour tour--interactive' : 'tour' }>
      { /* Interactive steps let clicks through to the live control below;
           Skip stays the way out, so nothing can trap the user. */ }
      <div className='tour--backdrop' onClick={ snooze } />
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
        <p className='tour--body'>{ current.body }</p>
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
