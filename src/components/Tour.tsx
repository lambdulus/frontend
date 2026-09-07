import React, { useEffect, useState } from 'react'

import { loadTourState, saveTourState } from '../Constants'

import '../styles/Tour.css'


export interface TourStep {
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
}

// The add-box affordance differs by notebook state: an empty notebook shows
// the big + panel, an occupied one a + row after each box.
const ADD_BOX_SELECTOR = '.top-level--create-box, .add_box_after, .create-box-plus'

export const TOUR_STEPS : Array<TourStep> = [
  {
    title : 'Welcome to Lambdulus',
    body : 'A notebook for playing with lambda calculus. Your work lives in notebooks — switch them in the tabs above. This tour takes a minute; skip anytime.',
    target : '.top-bar--tabs',
  },
  {
    title : 'Add a box',
    body : 'Boxes are the cells of a notebook — your evaluated sample below is one already. Add your own: click the + affordance yourself, or press Next and I will click it for you.',
    target : ADD_BOX_SELECTOR,
    advanceOn : ADD_BOX_SELECTOR,
  },
  {
    title : 'Write and evaluate',
    body : 'Type an expression, then Debug (Ctrl + Enter) to evaluate it step by step, or Exercise (Shift + Enter) to take the steps yourself. Lines above the expression define macros — NAME := definition, each ending with a semicolon.',
  },
  {
    title : 'Step through evaluation',
    body : 'Run walks all the way to the normal form, Step advances once — try it on your sample box below. A box\u2019s settings switch the strategy (normal, applicative…), toggle single-letter variables, and expand standalones.',
  },
  {
    title : 'Macros',
    body : 'Church numerals, booleans and arithmetic (Y, ZERO, SUC, +, *) are builtin. Your own definitions unfold in the Macros dock beside each box.',
  },
  {
    title : 'Make it yours',
    body : 'Hover the accent dots or box-style tiles to preview them live across the whole page — click to keep. The top bar also holds notebook settings, zen mode, and export.',
    target : '[title="Accent theme"]',
  },
]


interface Props {
  initialStep : number
  // __key of the demo box seeded for this tour, if any. Step two rings it;
  // a missing or deleted box simply leaves that step ringless.
  demoBoxKey : string | null
  onClose () : void
}

interface Ring {
  top : number
  left : number
  width : number
  height : number
}

function clampStep (step : number) : number {
  if (Number.isNaN(step)) {
    return 0
  }

  return Math.max(0, Math.min(TOUR_STEPS.length - 1, Math.floor(step)))
}

export default function Tour (props : Props) : JSX.Element {
  const { initialStep, demoBoxKey, onClose } : Props = props
  const steps : Array<TourStep> = TOUR_STEPS.map((step, i) =>
    i === 3 && demoBoxKey !== null ?
      { ...step, target : `[data-box-key="${demoBoxKey}"]` }
    :
      step
  )
  const [ step, setStep ] = useState(() => clampStep(initialStep))
  const [ ring, setRing ] = useState<Ring | null>(null)
  const current : TourStep = steps[step]
  const last : boolean = step === steps.length - 1

  // Step and done move; seeded and the demo key belong to the box,
  // never to the walk.
  const persist = (nextStep : number, done : boolean) => {
    const stored = loadTourState()
    saveTourState({ step : nextStep, done, seeded : stored?.seeded ?? false, demoBoxKey : stored?.demoBoxKey ?? null })
  }

  const go = (next : number) => {
    const clamped : number = clampStep(next)
    setStep(clamped)
    persist(clamped, false)
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
        go(step + 1)
      }
    }

    document.addEventListener('mousedown', onActivate, true)
    document.addEventListener('click', onActivate, true)

    return () => {
      document.removeEventListener('mousedown', onActivate, true)
      document.removeEventListener('click', onActivate, true)
    }
  }, [ step, current.advanceOn ])

  const next = () => {
    // Chauffeur mode: work the control ourselves (its flagged events open
    // the control's UI but never advance), then walk on exactly once.
    if (current.advanceOn !== undefined) {
      activateTarget(current.advanceOn)
    }

    go(step + 1)
  }

  // Skip (or backdrop): done for now, resume where left off via the icon.
  const snooze = () => {
    persist(step, true)
    onClose()
  }

  // Done on the last step: restart from the beginning next time.
  const finish = () => {
    persist(0, true)
    onClose()
  }

  useEffect(() => {
    setRing(null)

    if (!current.target) {
      return
    }

    const element : Element | null = document.querySelector(current.target)

    if (element === null) {
      return
    }

    const rect : DOMRect = element.getBoundingClientRect()

    if (rect.width === 0 && rect.height === 0) {
      return
    }

    setRing({ top : rect.top, left : rect.left, width : rect.width, height : rect.height })
  }, [ step, current.target ])

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
        <p className='tour--kicker'>Guided tour · { step + 1 } of { TOUR_STEPS.length }</p>
        <p className='tour--title'>{ current.title }</p>
        <p className='tour--body'>{ current.body }</p>
        <div className='tour--dots' aria-hidden='true'>
          {
            TOUR_STEPS.map((_, i : number) =>
              <span key={ i } className={ i === step ? 'tour--dot tour--dot--active' : 'tour--dot' } />
            )
          }
        </div>
        <div className='tour--actions'>
          {
            step > 0 ?
              <button className='tour--btn' onClick={ () => go(step - 1) }>Back</button>
            :
              <span />
          }
          <button className='tour--btn' onClick={ snooze }>Skip</button>
          {
            last ?
              <button className='tour--btn tour--btn--primary' onClick={ finish }>Done</button>
            :
              <button className='tour--btn tour--btn--primary' onClick={ next }>Next</button>
          }
        </div>
      </div>
    </div>
  )
}
