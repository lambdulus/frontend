// Manual mock for `react-monaco-editor` (picked up automatically by CRA jest).
// The real package ships untranspiled ESM that jest cannot parse, and no test
// needs an actual code editor — a stub div is enough.
const React = require('react');

function MonacoEditor () {
  return React.createElement('div', { 'data-testid': 'monaco-editor-mock' });
}

module.exports = MonacoEditor;
module.exports.default = MonacoEditor;
