const { test } = require('node:test');
const assert = require('node:assert');
const { formatCodeReply } = require('../commands/ai.js');

test('converts a real CODE_GENERATOR reply to a Discord code block', () => {
  const reply = '<thinking>A single function has nothing to preview.</thinking>\n' +
    '<artifact identifier="add" type="application/code" language="javascript" title="add">\n' +
    'function add(a, b) {\n  return a + b;\n}\n</artifact>\nIt returns a + b.';
  assert.strictEqual(formatCodeReply(reply),
    '```javascript\nfunction add(a, b) {\n  return a + b;\n}\n```\nIt returns a + b.');
});

test('converts several artifacts and keeps prose between them', () => {
  assert.strictEqual(
    formatCodeReply('<artifact language="py">\nprint(1)\n</artifact>\nand\n<artifact language="go">x</artifact>'),
    '```py\nprint(1)\n```\nand\n```go\nx\n```');
});

test('leaves text without tags untouched, indentation included', () => {
  assert.strictEqual(formatCodeReply('    indented\nnext'), '    indented\nnext');
});

test('drops every reasoning block, wherever it is', () => {
  assert.strictEqual(formatCodeReply('Sure.\n<thinking>r</thinking>\n<artifact language="js">x</artifact>'),
    'Sure.\n```js\nx\n```');
  assert.strictEqual(formatCodeReply('<thinking type="x">r</thinking>ok <thinking>s</thinking>\n\ndone'), 'ok done');
});

test('matches whole tag names only', () => {
  assert.strictEqual(formatCodeReply('<thinking_notes>keep</thinking_notes> and <thinking>a</thinking>b'),
    '<thinking_notes>keep</thinking_notes> and b');
  assert.strictEqual(formatCodeReply('<artifacts><artifact language="js">x</artifact></artifacts>'),
    '<artifacts>```js\nx\n```</artifacts>');
});

test('handles ">" inside quoted attributes', () => {
  assert.strictEqual(formatCodeReply('<artifact title="a > b" language="js">x</artifact>'), '```js\nx\n```');
});

test('treats tags inside an artifact as code', () => {
  assert.strictEqual(
    formatCodeReply('<artifact language="js">\nconst t = "<thinking>x</thinking><artifact id=1>";\n</artifact>'),
    '```js\nconst t = "<thinking>x</thinking><artifact id=1>";\n```');
});

test('keeps prose that mentions the closing tag outside the code block', () => {
  assert.strictEqual(formatCodeReply('<artifact language="xml">x</artifact>\nClose tags with </artifact>.'),
    '```xml\nx\n```\nClose tags with </artifact>.');
});

test('handles cut-off replies', () => {
  assert.strictEqual(formatCodeReply('<thinking>reasoning cut off'), '');
  assert.strictEqual(formatCodeReply('Use <thinking> tags'), 'Use <thinking> tags');
  assert.strictEqual(formatCodeReply('see <artifact language="js">\ncode cut'), 'see <artifact language="js">\ncode cut');
});

test('stays linear-time on hostile output', () => {
  const n = 50000;
  const started = Date.now();
  formatCodeReply('<artifact a>'.repeat(n) + '<artifactX'.repeat(n) + '</artifact>' + '<thinking>'.repeat(n));
  formatCodeReply('<thinking>' + '<artifact a>'.repeat(n));
  formatCodeReply('<artifact "'.repeat(n) + '<thinking>x</thinking>'.repeat(n));
  formatCodeReply('<thinking>x</thinking><artifact>y</artifact>'.repeat(n));
  assert.ok(Date.now() - started < 2000, `took ${Date.now() - started}ms`); // the old regex took minutes here
});
