import React, { Component } from 'react'

export default function BoxTopBar (props : { removeBox : () => void }) : JSX.Element {
  const { removeBox } = props

  return (
    <div>
      <i
        className='removeBox far fa-trash-alt'
        onClick={ removeBox }
        title='Remove this Box'
      />
    </div>
  )
}