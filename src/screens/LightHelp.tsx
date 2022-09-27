import React from 'react'
import 'github-markdown-css/github-markdown-light.css'

import guide from '../misc/UserGuide'
import ReactMarkdown from'react-markdown'

export default function Help (props : {}) : JSX.Element {
  (window as any).guide = guide
  return (
  <div className='helpSpace'>
    <ReactMarkdown className='markdown-body'>
      { guide }
    </ReactMarkdown>
    <br />
    <br />
    <br />
    { `version: ${process.env.REACT_APP_VERSION_INFO}` }
    <br />
    { `commit hash: ${process.env.REACT_APP_COMMIT}` }
  </div>)
}