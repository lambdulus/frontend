// Manual mock for `react-markdown` (picked up automatically by CRA jest).
// v7 ships ESM-only code that jest cannot parse; tests only need the
// markdown source rendered, not actual markdown processing.
const React = require('react');

function ReactMarkdown (props) {
  return React.createElement(
    'div',
    { 'data-testid': 'react-markdown-mock' },
    props && props.children
  );
}

module.exports = ReactMarkdown;
module.exports.default = ReactMarkdown;
