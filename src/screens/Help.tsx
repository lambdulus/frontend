import React from 'react'
import 'github-markdown-css'

import guide from '../misc/UserGuide'
const ReactMarkdown = require('react-markdown')

export default function Help (props : {}) : JSX.Element {
  return (
  <div className='helpSpace'>
    <ReactMarkdown className='markdown-body' source={ guide } />    
  </div>)
}