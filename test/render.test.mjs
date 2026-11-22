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
const { SkillRow, Panel, CreateDialog, DiagFooter } = module.components;

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

test('DiagFooter shows the version, root counts and a copy action', () => {
  const markup = renderToStaticMarkup(
    React.createElement(DiagFooter, {
      version: '0.2.0',
      platform: 'win32',
      roots: [
        { id: 'user-dsh', label: '~/.dsh/skills', path: 'C:\\Users\\me\\.dsh\\skills', count: 28 },
        { id: 'user-agents', label: '~/.agents/skills', path: 'C:\\Users\\me\\.agents\\skills', count: 0 },
      ],
      onCopy: noop,
      copied: false,
    }),
  );
  assert.match(markup, /v0\.2\.0/);
  assert.match(markup, /win32/);
  assert.match(markup, /~\/\.dsh\/skills · 28/);
  assert.match(markup, /~\/\.agents\/skills · 0/);
  assert.match(markup, /复制诊断信息/);
  assert.match(markup, /title="C:[^"]*skills"/);
});

test('CreateDialog renders its fields and keeps submit disabled until filled', () => {
  const empty = renderToStaticMarkup(
    React.createElement(CreateDialog, {
      form: { name: '', description: '', scope: 'user-dsh' },
      busy: false,
      error: '',
      onChange: noop,
      onSubmit: noop,
      onClose: noop,
    }),
  );
  assert.match(empty, /新建技能/);
  assert.match(empty, /技能名/);
  assert.match(empty, /一句话描述/);
  assert.match(empty, /disabled/);

  const filled = renderToStaticMarkup(
    React.createElement(CreateDialog, {
      form: { name: 'new-skill', description: 'Does things.', scope: 'user-agents' },
      busy: false,
      error: 'a problem',
      onChange: noop,
      onSubmit: noop,
      onClose: noop,
    }),
  );
  assert.match(filled, /new-skill/);
  assert.match(filled, /a problem/);
  assert.match(filled, /user-agents|共享/);
  assert.doesNotMatch(filled, /deck-btn primary" disabled/);
});
