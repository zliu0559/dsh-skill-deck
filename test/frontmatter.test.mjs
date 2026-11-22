import assert from 'node:assert/strict';
import test from 'node:test';

import {
  booleanField,
  parseFrontmatter,
  setBoolean,
  splitFrontmatter,
  validateSkillDocument,
} from '../lib/frontmatter.js';

const sample = [
  '---',
  'name: my-skill',
  'description: Does a thing.',
  'disable-model-invocation: true',
  'user-invocable: false',
  '---',
  '',
  '# Body',
  '',
].join('\n');

test('splitFrontmatter finds the block and keeps the body', () => {
  const parts = splitFrontmatter(sample);
  assert.ok(parts);
  assert.equal(parts.body.trim(), '# Body');
  assert.ok(parts.frontmatter.includes('name: my-skill'));
});

test('parseFrontmatter reads strings and booleans', () => {
  const parsed = parseFrontmatter(sample);
  assert.equal(parsed.data.name, 'my-skill');
  assert.equal(parsed.data.description, 'Does a thing.');
  assert.equal(booleanField(parsed.data, 'disable-model-invocation'), true);
  assert.equal(booleanField(parsed.data, 'user-invocable'), false);
  assert.equal(booleanField(parsed.data, 'missing'), undefined);
});

test('quoted descriptions keep colons and hashes', () => {
  const text = ['---', 'name: q', 'description: "Use when: a #b c"', '---', 'body'].join('\n');
  const parsed = parseFrontmatter(text);
  assert.equal(parsed.data.description, 'Use when: a #b c');
});

test('literal block scalars keep newlines and folding joins lines', () => {
  const literal = ['---', 'name: l', 'description: |', '  first line', '  second line', '---', ''].join('\n');
  const folded = ['---', 'name: f', 'description: >-', '  first line', '  second line', 'other: x', '---', ''].join('\n');
  assert.equal(parseFrontmatter(literal).data.description, 'first line\nsecond line\n');
  assert.equal(parseFrontmatter(folded).data.description, 'first line second line');
  assert.equal(parseFrontmatter(folded).data.other, 'x');
});

test('setBoolean rewrites an existing key and preserves the rest', () => {
  const result = setBoolean(sample, 'disable-model-invocation', false);
  assert.equal(result.changed, true);
  assert.ok(result.text.includes('disable-model-invocation: false'));
  assert.ok(result.text.includes('# Body'));
  assert.ok(result.text.includes('user-invocable: false'));
});

test('setBoolean appends a missing key and preserves CRLF', () => {
  const text = ['---', 'name: c', 'description: d', '---', '', 'body'].join('\r\n');
  const result = setBoolean(text, 'user-invocable', false);
  assert.ok(result.text.includes('user-invocable: false'));
  assert.ok(result.text.includes('\r\n'));
  assert.ok(!result.text.includes('\n\n---'));
});

test('setBoolean is a no-op when the value already matches', () => {
  const result = setBoolean(sample, 'user-invocable', false);
  assert.equal(result.changed, false);
  assert.equal(result.text, sample);
});

test('validateSkillDocument enforces name and description', () => {
  assert.equal(validateSkillDocument(sample, { expectedName: 'my-skill' }).ok, true);
  assert.equal(validateSkillDocument(sample, { expectedName: 'other' }).ok, false);
  assert.equal(validateSkillDocument('---\nname: x\n---\n').ok, false);
  assert.equal(validateSkillDocument('no frontmatter').ok, false);
  assert.equal(validateSkillDocument('---\nname: Bad_Name\ndescription: d\n---\n').ok, false);
});
