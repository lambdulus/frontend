import React, { useEffect, useState } from 'react'

import { saveTourState } from '../Constants'

import '../styles/Tour.css'


export interface TourStep {
  title : string
  body : string
  // CSS selector of the UI the step points at. When it matches a visible
  // element a ring highlights it; otherwise the card simply stands alone,
  // so steps never break on screens where the target is absent.
  target ?: string
}

export const TOUR_STEPS : Array<TourStep> = [
  {
    title : 'Welcome to Lambdulus',
    body : 'A notebook for playing with lambda calculus. Your work lives in notebooks — switch them in the tabs above. This tour takes a minute; skip anytime.',
    target : '.top-bar--tabs',
  },
  {
    title : 'Add a box',
    body : 'Boxes are the cells of a notebook. Hit the + affordance to add a λ Expression box for evaluating, or a Markdown box for notes.',
    // Empty notebooks offer the big + panel, occupied ones a + row after
    // each box — whichever is on screen gets the ring.
    target : '.top-level--create-box, .add_box_after',
  },
  {
    title : 'Write and evaluate',
    body : 'Type an expression, then Debug (Ctrl + Enter) to evaluate it step by step, or Exercise (Shift + Enter) to take the steps yourself. Lines above the expression define macros — NAME := definition, each ending with a semicolon.',
  },
  {
    title : 'Step through evaluation',
    body : 'Run walks all the way, Step advances once. A box\u2019s settings switch the strategy (normal, applicative…), toggle single-letter variables, and expand standalones.',
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
  const { initialStep, onClose } : Props = props
  const [ step, setStep ] = useState(() => clampStep(initialStep))
  const [ ring, setRing ] = useState<Ring | null>(null)
  const current : TourStep = TOUR_STEPS[step]
  const last : boolean = step === TOUR_STEPS.length - 1

  const go = (next : number) => {
    const clamped : number = clampStep(next)
    setStep(clamped)
    saveTourState({ step : clamped, done : false })
  }

  // Skip (or backdrop): done for now, resume where left off via the icon.
  const snooze = () => {
    saveTourState({ step, done : true })
    onClose()
  }

  // Done on the last step: restart from the beginning next time.
  const finish = () => {
    saveTourState({ step : 0, done : true })
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
    <div className='tour'>
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
              <button className='tour--btn tour--btn--primary' onClick={ () => go(step + 1) }>Next</button>
          }
        </div>
      </div>
    </div>
  )
}
