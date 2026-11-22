import assert from 'node:assert/strict';
import test from 'node:test';
import { JSDOM } from 'jsdom';

// React DOM decides at module-evaluation time whether it has a DOM, so the
// window must exist before React and the plugin are imported. Everything that
// touches the browser therefore arrives through dynamic imports below.
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://127.0.0.1:52603/',
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
for (const key of [
  'HTMLElement',
  'HTMLInputElement',
  'HTMLTextAreaElement',
  'Node',
  'Event',
  'MouseEvent',
  'InputEvent',
  'KeyboardEvent',
]) {
  globalThis[key] = dom.window[key];
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let captured = null;
dom.window.__ModuleLoader__ = {
  load(definition) {
    captured = definition;
  },
};

let profile = {
  ok: true,
  roots: [{ id: 'user-dsh', path: '/home/me/.dsh/skills', label: '~/.dsh/skills', writable: true }],
  skills: [
    {
      name: 'demo',
      description: 'A demo skill.',
      path: '/home/me/.dsh/skills/demo/SKILL.md',
      dir: '/home/me/.dsh/skills/demo',
      isBundle: true,
      root: 'user-dsh',
      rootPath: '/home/me/.dsh/skills',
      files: 1,
      bytes: 64,
      updatedAt: '2026-11-22T00:00:00.000Z',
      modelInvocable: true,
      userInvocable: true,
      valid: true,
      error: null,
    },
  ],
  totals: { skills: 1, modelInvocable: 1, userInvocable: 1, invalid: 0 },
  version: '0.2.0',
  platform: 'linux',
};

const calls = [];
globalThis.fetch = async (url, init) => {
  const path = String(url).replace('http://127.0.0.1:52603', '');
  const body = init?.body ? JSON.parse(init.body) : null;
  calls.push({ path, body });
  const json = (payload) => ({ ok: true, status: 200, json: async () => payload });
  if (path === '/dsh-skill-deck/state') return json(profile);
  if (path === '/dsh-skill-deck/read') {
    return json({ ok: true, content: '---\nname: demo\n---\n\n# Body\n', revision: 'rev-1' });
  }
  if (path === '/dsh-skill-deck/toggle') {
    profile = {
      ...profile,
      skills: profile.skills.map((skill) =>
        skill.name === body.name ? { ...skill, modelInvocable: body.enabled } : skill,
      ),
    };
    return json({ ok: true, skill: profile.skills[0], revision: 'rev-2' });
  }
  if (path === '/dsh-skill-deck/save') {
    return json({ ok: true, skill: { ...profile.skills[0] }, revision: 'rev-3' });
  }
  if (path === '/dsh-skill-deck/create') {
    const created = { ...profile.skills[0], name: body.name, description: body.description };
    profile = { ...profile, skills: [...profile.skills, created], totals: { ...profile.totals, skills: 2 } };
    return json({ ok: true, skill: created, revision: 'rev-4' });
  }
  if (path === '/dsh-skill-deck/duplicate') {
    const copy = { ...profile.skills[0], name: body.newName };
    profile = { ...profile, skills: [...profile.skills, copy], totals: { ...profile.totals, skills: profile.skills.length + 1 } };
    return json({ ok: true, skill: copy, revision: 'rev-5' });
  }
  if (path === '/dsh-skill-deck/signal') return { ok: true, status: 200, json: async () => ({ ok: true }) };
  if (path === '/dsh-skill-deck/delete') return json({ ok: true, trashedTo: '/tmp/x' });
  throw new Error('unexpected request ' + path);
};

const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react-dom/test-utils');
await import('../client.js');

const module = captured.factory(() => React);
const { Panel } = module.components;
const container = document.getElementById('root');
const root = createRoot(container);

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function buttonByText(text) {
  return [...container.querySelectorAll('button')].find((node) => node.textContent?.trim() === text);
}

async function click(node) {
  assert.ok(node, 'click target exists');
  await act(async () => {
    node.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  });
  await settle();
}

function setValue(element, value) {
  const proto =
    element instanceof dom.window.HTMLTextAreaElement
      ? dom.window.HTMLTextAreaElement.prototype
      : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
  element.dispatchEvent(new dom.window.InputEvent('input', { bubbles: true, data: value }));
}

test('panel loads skills and renders the row', async () => {
  await act(async () => {
    root.render(React.createElement(Panel));
  });
  await settle();
  await settle();
  assert.match(container.textContent, /demo/);
  assert.match(container.textContent, /A demo skill\./);
  assert.ok(buttonByText('Model'), 'model switch rendered');
  assert.ok(buttonByText('Edit'), 'edit button rendered');
});

test('clicking the model switch posts the expected toggle', async () => {
  calls.length = 0;
  await click(buttonByText('Model'));
  const toggle = calls.find((call) => call.path === '/dsh-skill-deck/toggle');
  assert.deepEqual(toggle?.body, { name: 'demo', surface: 'model', enabled: false });
  assert.equal(buttonByText('Model')?.getAttribute('aria-pressed'), 'false');
});

test('typing in the search box filters the list', async () => {
  const search = container.querySelector('input[type="search"]');
  await act(async () => {
    setValue(search, 'nope');
  });
  await settle();
  assert.equal(container.querySelectorAll('.deck-row').length, 0);
  assert.match(container.textContent, /No matching skills/);
  await act(async () => {
    setValue(search, 'demo');
  });
  await settle();
  assert.equal(container.querySelectorAll('.deck-row').length, 1);
  await act(async () => {
    setValue(search, '');
  });
  await settle();
});

test('editing a skill reads, edits and saves with the revision', async () => {
  calls.length = 0;
  await click(buttonByText('Edit'));
  assert.ok(calls.some((call) => call.path === '/dsh-skill-deck/read'));
  const textarea = container.querySelector('textarea');
  assert.ok(textarea, 'editor opened');
  assert.match(textarea.value, /# Body/);
  await act(async () => {
    setValue(textarea, textarea.value + '\nMore content.\n');
  });
  await settle();
  await click(buttonByText('Save'));
  const save = calls.find((call) => call.path === '/dsh-skill-deck/save');
  assert.ok(save, 'save was requested');
  assert.equal(save.body.name, 'demo');
  assert.equal(save.body.revision, 'rev-1');
  assert.match(save.body.content, /More content\./);
  assert.equal(container.querySelector('textarea'), null, 'editor closed after saving');
});

test('the create dialog posts a new skill', async () => {
  calls.length = 0;
  await click(buttonByText('New'));
  const inputs = [...container.querySelectorAll('.deck-modal input')];
  assert.equal(inputs.length, 2);
  await act(async () => {
    setValue(inputs[0], 'fresh-one');
    setValue(inputs[1], 'A brand new skill.');
  });
  await settle();
  await click(buttonByText('Create'));
  const create = calls.find((call) => call.path === '/dsh-skill-deck/create');
  assert.ok(create, 'create was requested');
  assert.deepEqual(create.body, { name: 'fresh-one', description: 'A brand new skill.', scope: 'user-dsh' });
});

test('the duplicate dialog copies the skill under a new name', async () => {
  calls.length = 0;
  await click(buttonByText('Duplicate'));
  const input = container.querySelector('.deck-modal input');
  assert.ok(input, 'duplicate dialog opened');
  assert.equal(input.value, 'demo-copy');
  await act(async () => {
    setValue(input, 'demo-renamed');
  });
  await settle();
  await click(buttonByText('Create copy'));
  const duplicate = calls.find((call) => call.path === '/dsh-skill-deck/duplicate');
  assert.ok(duplicate, 'duplicate was requested');
  assert.deepEqual(duplicate.body, { name: 'demo', newName: 'demo-renamed' });
});

test('cleanup', async () => {
  await act(async () => {
    root.unmount();
  });
});
