import React from 'react'
import 'github-markdown-css/github-markdown-light.css'
import '../styles/Markdown.css'

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
    { `version: ${import.meta.env.VITE_VERSION_INFO}` }
    <br />
    { `commit hash: ${import.meta.env.VITE_COMMIT}` }
  </div>)
}