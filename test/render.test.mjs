import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// The client module registers itself through a browser-only loader; stub just
// enough of the page for the factory to run, then render its components with a
// real React so markup and state wiring are exercised.
let captured = null;
globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      captured = definition;
    },
  },
};
Object.defineProperty(globalThis, 'navigator', {
  value: { language: 'zh-CN' },
  configurable: true,
});
globalThis.document = {
  querySelector: () => null,
  createElement: () => ({ dataset: {}, textContent: '' }),
  head: { appendChild() {} },
};

await import('../client.js');
const module = captured.factory((id) => {
  assert.equal(id, 'react');
  return React;
});
const { SkillRow, Panel } = module.components;

const skill = {
  name: 'demo-skill',
  description: 'A demo skill used by the render test.',
  root: 'user-dsh',
  files: 3,
  bytes: 2048,
  updatedAt: '2026-11-22T00:00:00.000Z',
  modelInvocable: true,
  userInvocable: false,
  valid: true,
};

const noop = () => {};

test('SkillRow renders the name, description, badges and both switches', () => {
  const markup = renderToStaticMarkup(
    React.createElement(SkillRow, {
      skill,
      busy: '',
      onToggle: noop,
      onEdit: noop,
      onReveal: noop,
      onRemove: noop,
    }),
  );
  assert.match(markup, /demo-skill/);
  assert.match(markup, /A demo skill used by the render test\./);
  assert.match(markup, /deck-badge/);
  assert.match(markup, /2\.0 KB/);
  assert.match(markup, /3 个文件/);
  const pressed = markup.match(/aria-pressed="(true|false)"/g) ?? [];
  assert.deepEqual(pressed, ['aria-pressed="true"', 'aria-pressed="false"']);
});

test('SkillRow marks an invalid skill and shows the action buttons', () => {
  const markup = renderToStaticMarkup(
    React.createElement(SkillRow, {
      skill: { ...skill, valid: false, description: '' },
      busy: 'demo-skill:read',
      onToggle: noop,
      onEdit: noop,
      onReveal: noop,
      onRemove: noop,
    }),
  );
  assert.match(markup, /需修复/);
  assert.match(markup, /编辑/);
  assert.match(markup, /打开目录/);
  assert.match(markup, /删除/);
  assert.match(markup, /disabled/);
});

test('Panel renders its loading state without a backend', () => {
  const markup = renderToStaticMarkup(React.createElement(Panel));
  assert.match(markup, /正在读取技能/);
  assert.match(markup, /技能/);
});
