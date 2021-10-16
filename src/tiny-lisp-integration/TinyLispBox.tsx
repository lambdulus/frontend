import React, { PureComponent } from 'react'

import { BoxState, BoxType } from '../Types'

import { TinyLispState } from './Types'
import {} from './Constants'


interface Props {
  state : TinyLispState
  isActive : boolean
  isFocused : boolean

  setBoxState (state : TinyLispState) : void
}

export default class TinyLispBox extends PureComponent<Props> {
  constructor (props : Props) {
    super(props)
  }

  render () {
    return (
      <div>
        Hello From The Lisp Side
      </div>
    )
  }

}
