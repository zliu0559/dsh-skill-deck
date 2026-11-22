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
  roots: [
    { id: 'user-dsh', path: '/home/me/.dsh/skills', label: '~/.dsh/skills', writable: true },
    { id: 'user-agents', path: '/home/me/.agents/skills', label: '~/.agents/skills', writable: true },
  ],
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
      category: 'Uncategorized',
      author: 'Unknown',
      series: '',
      manualCategory: '',
      manualAuthor: '',
      manualSeries: '',
    },
    {
      name: 'docs-skill',
      description: 'Writes documentation.',
      path: '/home/me/.dsh/skills/docs-skill/SKILL.md',
      dir: '/home/me/.dsh/skills/docs-skill',
      isBundle: true,
      root: 'user-dsh',
      rootPath: '/home/me/.dsh/skills',
      files: 2,
      bytes: 128,
      updatedAt: '2026-11-22T00:00:00.000Z',
      modelInvocable: true,
      userInvocable: false,
      valid: true,
      error: null,
      category: 'documentation',
      author: 'Docs Writer',
      series: 'Docs',
      manualCategory: 'documentation',
      manualAuthor: '',
      manualSeries: 'Docs',
    },
    {
      name: 'lint-skill',
      description: 'Lints documentation.',
      path: '/home/me/.agents/skills/lint-skill/SKILL.md',
      dir: '/home/me/.agents/skills/lint-skill',
      isBundle: true,
      root: 'user-agents',
      rootPath: '/home/me/.agents/skills',
      files: 1,
      bytes: 32,
      updatedAt: '2026-11-22T00:00:00.000Z',
      modelInvocable: true,
      userInvocable: false,
      valid: true,
      error: null,
      category: 'Documentation',
      author: 'docs writer',
      series: 'docs',
      manualCategory: 'Documentation',
      manualAuthor: '',
      manualSeries: 'docs',
    },
    {
      name: 'review-skill',
      description: 'Reviews pull requests.',
      path: '/home/me/.agents/skills/review-skill/SKILL.md',
      dir: '/home/me/.agents/skills/review-skill',
      isBundle: true,
      root: 'user-agents',
      rootPath: '/home/me/.agents/skills',
      files: 2,
      bytes: 96,
      updatedAt: '2026-11-22T00:00:00.000Z',
      modelInvocable: true,
      userInvocable: true,
      valid: false,
      error: 'missing metadata',
      category: 'review',
      author: 'Dex Horthy',
      series: 'Reviewers',
      manualCategory: 'review',
      manualAuthor: 'Dex Horthy',
      manualSeries: 'Reviewers',
    },
  ],
  totals: { skills: 4, modelInvocable: 3, userInvocable: 2, invalid: 1 },
  version: '0.2.0',
  platform: 'linux',
};

// Earlier tests create and duplicate skills. The card-wall tests start from a
// known deck by restoring this snapshot and refreshing the panel.
const baseProfile = JSON.parse(JSON.stringify(profile));

const calls = [];
// Drag tests can hold an annotate request open to observe the optimistic board,
// and hand the next annotate call a failure to observe the rollback.
let annotateGate = null;
let annotateFailure = null;
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
    return json({
      ok: true,
      skill: profile.skills.find((skill) => skill.name === body.name),
      revision: 'rev-2',
    });
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
  if (path === '/dsh-skill-deck/annotate') {
    if (annotateGate) await annotateGate.promise;
    if (annotateFailure) {
      const failure = annotateFailure;
      annotateFailure = null;
      return {
        ok: false,
        status: failure.status ?? 500,
        json: async () => ({ ok: false, error: failure.message ?? 'write failed' }),
      };
    }
    const fallbackAuthors = {
      demo: 'Unknown',
      'docs-skill': 'Docs Writer',
      'lint-skill': 'docs writer',
      'review-skill': 'Dex Horthy',
    };
    // Omitted fields stay untouched, so a drag move can send only name+series.
    const category = typeof body.category === 'string' ? body.category.trim() : undefined;
    const author = typeof body.author === 'string' ? body.author.trim() : undefined;
    const series = typeof body.series === 'string' ? body.series.trim() : undefined;
    const previousSeries =
      typeof body.previousSeries === 'string' ? body.previousSeries.trim().toLowerCase() : '';
    profile = {
      ...profile,
      skills: profile.skills.map((skill) => {
        if (
          previousSeries &&
          String(skill.manualSeries ?? '').trim().toLowerCase() === previousSeries
        ) {
          return { ...skill, series: series ?? '', manualSeries: series ?? '' };
        }
        if (skill.name !== body.name) return skill;
        return {
          ...skill,
          ...(category === undefined
            ? {}
            : { category: category || 'Uncategorized', manualCategory: category }),
          ...(author === undefined
            ? {}
            : { author: author || fallbackAuthors[skill.name] || 'Unknown', manualAuthor: author }),
          ...(series === undefined ? {} : { series, manualSeries: series }),
        };
      }),
    };
    return json({ ok: true, skill: profile.skills.find((skill) => skill.name === body.name) });
  }
  if (path === '/dsh-skill-deck/signal') return { ok: true, status: 200, json: async () => ({ ok: true }) };
  if (path === '/dsh-skill-deck/reveal') return json({ ok: true });
  if (path === '/dsh-skill-deck/delete') return json({ ok: true, trashedTo: '/tmp/x' });
  throw new Error('unexpected request ' + path);
};

const React = (await import('react')).default;
const { createRoot } = await import('react-dom/client');
const { act } = await import('react-dom/test-utils');
await import('../client.js');

const module = captured.factory(() => React);
const { Panel } = module.components;
// The client normally injects its stylesheet from apply(); the panel-only
// tests call apply with a minimal host so the grid rules can be asserted.
module.apply({
  effect() {},
  slots: {
    inject(_name, callback) {
      callback();
    },
    register() {
      return () => {};
    },
  },
});
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

function rowFor(name) {
  return [...container.querySelectorAll('.deck-row')].find(
    (row) => row.querySelector('.deck-name')?.firstChild?.textContent === name,
  );
}

function buttonIn(row, text) {
  return [...row.querySelectorAll('button')].find((node) => node.textContent?.trim() === text);
}

function cardFor(name, scope = container) {
  return [...scope.querySelectorAll('.deck-card')].find((card) => card.dataset.skill === name);
}

function groupSummaries(scope = container) {
  return [...scope.querySelectorAll('.deck-group')].map((group) => ({
    title: group.querySelector('.deck-group-title')?.textContent?.trim(),
    count: group.querySelector('.deck-group-count')?.textContent?.trim(),
    cards: [...group.querySelectorAll('.deck-card')].map((card) => card.dataset.skill),
  }));
}

async function pick(select, value) {
  assert.ok(select, 'select exists');
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, 'value').set.call(select, value);
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
  await settle();
}

function buttonInScope(scope, text) {
  return [...scope.querySelectorAll('button')].find((node) => node.textContent?.trim() === text);
}

function mapTiles(scope = container) {
  return [...scope.querySelectorAll('.deck-map-tile')];
}

function mapTileFor(name, scope = container) {
  return mapTiles(scope).find((tile) => tile.dataset.skill === name);
}

function mapModules(scope = container) {
  return [...scope.querySelectorAll('.deck-map-module')].map((module) => ({
    title: module.querySelector('.deck-map-module-title')?.textContent?.trim(),
    count: module.querySelector('.deck-map-module-count')?.textContent?.trim(),
    status: module.querySelector('.deck-map-module-status')?.textContent?.trim(),
    tiles: [...module.querySelectorAll('.deck-map-tile')].map((tile) => tile.dataset.skill),
    unassigned: module.dataset.unassigned === 'true',
    empty: module.classList.contains('is-empty'),
  }));
}

function mapModuleFor(title, scope = container) {
  return [...scope.querySelectorAll('.deck-map-module')].find(
    (module) => module.querySelector('.deck-map-module-title')?.textContent?.trim() === title,
  );
}

function legendEntries(scope = container) {
  return [...scope.querySelectorAll('.deck-legend-item')].map((item) => ({
    label: item.querySelector('.deck-legend-label')?.textContent?.trim(),
    count: item.querySelector('.deck-legend-count')?.textContent?.trim(),
    color: item.querySelector('.deck-legend-swatch')?.style.backgroundColor,
    status: item.dataset.status,
  }));
}

function statusLegend(scope = container) {
  return legendEntries(scope).map((entry) => [entry.label, entry.count]);
}

async function hover(node) {
  assert.ok(node, 'hover target exists');
  await act(async () => {
    node.dispatchEvent(
      new dom.window.MouseEvent('mouseover', { bubbles: true, relatedTarget: document.body }),
    );
  });
  await settle();
}

async function unhover(node) {
  assert.ok(node, 'hover target exists');
  await act(async () => {
    node.dispatchEvent(
      new dom.window.MouseEvent('mouseout', { bubbles: true, relatedTarget: document.body }),
    );
  });
  await settle();
}

async function focusNode(node) {
  assert.ok(node, 'focus target exists');
  await act(async () => {
    node.focus();
  });
  await settle();
}

async function blurActive() {
  await act(async () => {
    document.activeElement?.blur();
  });
  await settle();
}

/**
 * jsdom has no layout engine, so the map overlay's measurement is exercised by
 * giving only map tiles and the popover a viewport box. Everything else keeps
 * the real (all-zero) rect.
 */
function stubMapGeometry(tiles, popover = { width: 260, height: 140 }) {
  const proto = dom.window.HTMLElement.prototype;
  const original = proto.getBoundingClientRect;
  const box = (left, top, width, height) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  });
  proto.getBoundingClientRect = function measuredBox() {
    if (this.classList?.contains('deck-map-popover')) return box(0, 0, popover.width, popover.height);
    const rect = this.dataset?.skill ? tiles[this.dataset.skill] : null;
    if (this.classList?.contains('deck-map-tile') && rect) {
      return box(rect.left, rect.top, rect.width, rect.height);
    }
    return original.call(this);
  };
  return () => {
    proto.getBoundingClientRect = original;
  };
}

/**
 * Pretend the viewport is narrow or the pointer is coarse. The map reads the
 * media query once per mount, so stubs must be installed before rendering.
 */
function stubCompactLayout() {
  const original = dom.window.matchMedia;
  dom.window.matchMedia = () => ({
    matches: true,
    media: '(max-width: 640px), (pointer: coarse)',
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false;
    },
  });
  return () => {
    dom.window.matchMedia = original;
  };
}

/**
 * Hold the next annotate request open so a test can observe the optimistic
 * board before the write settles. Returns a release function.
 */
function gateAnnotate() {
  let release;
  annotateGate = {
    promise: new Promise((resolve) => {
      release = resolve;
    }),
  };
  return () => {
    annotateGate = null;
    release();
  };
}

/**
 * jsdom does not implement DataTransfer. A plain stub is enough: the client
 * only stores the skill name and reads it back on drop.
 */
function makeDragData(name) {
  const data = new Map();
  if (name) {
    data.set('application/x-dsh-skill', name);
    data.set('text/plain', name);
  }
  return {
    effectAllowed: '',
    dropEffect: '',
    setData(type, value) {
      data.set(type, String(value));
    },
    getData(type) {
      return data.get(type) ?? '';
    },
  };
}

function dragEvent(type, dataTransfer, props = {}) {
  const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', { value: dataTransfer });
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(event, key, { value, configurable: true });
  }
  return event;
}

async function dragStart(tile, data = makeDragData(tile.dataset.skill)) {
  assert.ok(tile, 'drag source exists');
  await act(async () => {
    tile.dispatchEvent(dragEvent('dragstart', data));
  });
  await settle();
  return data;
}

async function dragOver(target, data, props = {}) {
  assert.ok(target, 'drop target exists');
  await act(async () => {
    target.dispatchEvent(dragEvent('dragover', data, props));
  });
  await settle();
}

async function dropOn(target, data, props = {}) {
  assert.ok(target, 'drop target exists');
  await act(async () => {
    target.dispatchEvent(dragEvent('drop', data, props));
  });
  await settle();
}

async function dragEnd(tile, data = makeDragData()) {
  assert.ok(tile, 'drag source exists');
  await act(async () => {
    tile.dispatchEvent(dragEvent('dragend', data));
  });
  await settle();
}

/** Give the board a viewport box so edge auto-scroll can be measured. */
function stubBoardGeometry(rect = { top: 100, height: 400 }) {
  const proto = dom.window.HTMLElement.prototype;
  const original = proto.getBoundingClientRect;
  proto.getBoundingClientRect = function measuredBoard() {
    if (this.classList?.contains('deck-map')) {
      return {
        left: 0,
        top: rect.top,
        width: 800,
        height: rect.height,
        right: 800,
        bottom: rect.top + rect.height,
        x: 0,
        y: rect.top,
        toJSON() {
          return this;
        },
      };
    }
    return original.call(this);
  };
  return () => {
    proto.getBoundingClientRect = original;
  };
}

async function ensureMapView(scope = container) {
  const mapButton = buttonInScope(scope, 'Map');
  assert.ok(mapButton, 'map view control');
  if (mapButton.getAttribute('aria-pressed') !== 'true') await click(mapButton);
  assert.ok(scope.querySelector('.deck-map'), 'the map view is rendered');
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
  assert.ok(container.querySelector('textarea'), 'the created skill opens in the editor');
  await click(buttonByText('Cancel'));
  assert.equal(container.querySelector('.deck-modal'), null, 'editor closed');
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

test('tagging a skill offers existing categories and saves it', async () => {
  const demoRow = rowFor('demo');
  assert.match(demoRow.textContent, /Uncategorized/);
  assert.match(demoRow.textContent, /Unknown/);
  await click(buttonIn(demoRow, 'Tag'));

  const dialog = container.querySelector('.deck-modal');
  assert.ok(dialog, 'annotation editor opened');
  const inputs = [...dialog.querySelectorAll('input')];
  assert.equal(inputs.length, 3, 'category, author and series fields');
  const suggestions = [...dialog.querySelectorAll('datalist option')].map((option) => option.value);
  assert.ok(suggestions.includes('documentation'), 'existing category is suggested: ' + suggestions.join(','));
  assert.ok(suggestions.includes('Docs'), 'existing series is suggested: ' + suggestions.join(','));

  await act(async () => {
    setValue(inputs[0], 'review');
    setValue(inputs[1], 'Dex Horthy');
  });
  await settle();
  calls.length = 0;
  await click(buttonByText('Save tags'));

  const annotate = calls.find((call) => call.path === '/dsh-skill-deck/annotate');
  assert.deepEqual(annotate?.body, {
    name: 'demo',
    category: 'review',
    author: 'Dex Horthy',
    series: '',
  });
  assert.equal(container.querySelector('.deck-modal'), null, 'editor closed after saving');
  assert.match(rowFor('demo').textContent, /review/);
  assert.match(rowFor('demo').textContent, /Dex Horthy/);

  await click(buttonByText('Refresh'));
  assert.match(rowFor('demo').textContent, /review/, 'saved values survive a reload');
  assert.match(rowFor('demo').textContent, /Dex Horthy/);
});

test('clearing category and author restores the fallback labels', async () => {
  await click(buttonIn(rowFor('demo'), 'Tag'));
  const inputs = [...container.querySelectorAll('.deck-modal input')];
  assert.equal(inputs[0].value, 'review', 'editor starts from the saved category');
  assert.equal(inputs[1].value, 'Dex Horthy', 'editor starts from the saved author');
  assert.equal(inputs[2].value, '', 'the manual series starts empty');
  await act(async () => {
    setValue(inputs[0], '');
    setValue(inputs[1], '');
  });
  await settle();
  calls.length = 0;
  await click(buttonByText('Save tags'));
  const annotate = calls.find((call) => call.path === '/dsh-skill-deck/annotate');
  assert.deepEqual(annotate?.body, { name: 'demo', category: '', author: '', series: '' });
  assert.match(rowFor('demo').textContent, /Uncategorized/);
  assert.match(rowFor('demo').textContent, /Unknown/);
});

test('the annotation dialog saves a series from existing suggestions and clears it', async () => {
  await click(buttonIn(rowFor('demo'), 'Tag'));
  const dialog = container.querySelector('.deck-modal');
  const inputs = [...dialog.querySelectorAll('input')];
  assert.equal(inputs.length, 3, 'the dialog exposes a series field');
  assert.equal(inputs[2].value, '', 'demo is unassigned');
  const seriesList = dialog.querySelector('#' + inputs[2].getAttribute('list'));
  assert.ok(seriesList, 'the series field is backed by a suggestion list');
  const seriesSuggestions = [...seriesList.querySelectorAll('option')].map((option) => option.value);
  assert.deepEqual(seriesSuggestions, ['Docs', 'Reviewers'], 'existing series spellings are suggested');

  await act(async () => {
    setValue(inputs[2], 'Docs');
  });
  await settle();
  calls.length = 0;
  await click(buttonByText('Save tags'));
  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'demo',
    category: '',
    author: '',
    series: 'Docs',
  });

  await click(buttonIn(rowFor('demo'), 'Tag'));
  const reopened = [...container.querySelectorAll('.deck-modal input')];
  assert.equal(reopened[2].value, 'Docs', 'the saved series is pre-filled');
  await act(async () => {
    setValue(reopened[2], '');
  });
  await settle();
  calls.length = 0;
  await click(buttonByText('Save tags'));
  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'demo',
    category: '',
    author: '',
    series: '',
  });
});

test('the Cards view groups skills by category with counts and a last fallback group', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  calls.length = 0;
  await click(buttonByText('Refresh'));

  assert.ok(buttonByText('List'), 'list view control');
  assert.ok(buttonByText('Cards'), 'cards view control');
  const groupBy = container.querySelector('select.deck-groupby');
  assert.ok(groupBy, 'group-by selector');
  assert.equal(groupBy.value, 'category', 'category grouping is the default');

  await click(buttonByText('Cards'));
  assert.equal(buttonByText('Cards')?.getAttribute('aria-pressed'), 'true');
  assert.equal(buttonByText('List')?.getAttribute('aria-pressed'), 'false');
  assert.equal(container.querySelectorAll('.deck-row').length, 0, 'list is replaced by cards');
  assert.equal(container.querySelectorAll('.deck-card').length, 4);
  assert.deepEqual(groupSummaries(), [
    { title: 'documentation', count: '2', cards: ['docs-skill', 'lint-skill'] },
    { title: 'review', count: '1', cards: ['review-skill'] },
    { title: 'Uncategorized', count: '1', cards: ['demo'] },
  ]);
});

test('the group-by selector regroups the cards by author and root', async () => {
  const groupBy = container.querySelector('select.deck-groupby');
  await pick(groupBy, 'author');
  assert.deepEqual(
    groupSummaries().map((group) => [group.title, group.count]),
    [
      ['Docs Writer', '2'],
      ['Dex Horthy', '1'],
      ['Unknown', '1'],
    ],
  );

  await pick(groupBy, 'root');
  assert.deepEqual(
    groupSummaries().map((group) => [group.title, group.count]),
    [
      ['~/.agents/skills', '2'],
      ['~/.dsh/skills', '2'],
    ],
  );

  await pick(groupBy, 'category');
});

test('a blank root gets its own fallback label instead of the author fallback', async () => {
  profile = {
    ...JSON.parse(JSON.stringify(baseProfile)),
    skills: [
      { ...baseProfile.skills[0], name: 'rootless-skill', root: '', rootPath: '' },
      { ...baseProfile.skills[1] },
    ],
    totals: { ...baseProfile.totals, skills: 2 },
  };
  await click(buttonByText('Refresh'));
  const groupBy = container.querySelector('select.deck-groupby');
  await pick(groupBy, 'root');
  assert.deepEqual(
    groupSummaries().map((group) => [group.title, group.count]),
    [
      ['~/.dsh/skills', '1'],
      ['Unknown root', '1'],
    ],
  );

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
  await pick(groupBy, 'category');
});

test('each card shows the skill name, description, surfaces, size and validity', async () => {
  const demoCard = cardFor('demo');
  assert.ok(demoCard, 'demo card rendered');
  assert.match(demoCard.textContent, /demo/);
  assert.match(demoCard.textContent, /A demo skill\./);
  assert.ok(buttonIn(demoCard, 'Model'), 'model surface toggle');
  assert.ok(buttonIn(demoCard, 'Slash'), 'slash surface toggle');
  assert.match(demoCard.textContent, /1 files/);
  assert.match(demoCard.textContent, /64 B/);
  assert.match(cardFor('review-skill').textContent, /Needs fixing/);
});

test('card toggles and actions use the existing routes and confirmation', async () => {
  calls.length = 0;
  await click(buttonIn(cardFor('demo'), 'Model'));
  assert.deepEqual(
    calls.find((call) => call.path === '/dsh-skill-deck/toggle')?.body,
    { name: 'demo', surface: 'model', enabled: false },
  );
  assert.equal(buttonIn(cardFor('demo'), 'Model')?.getAttribute('aria-pressed'), 'false');

  calls.length = 0;
  await click(buttonIn(cardFor('demo'), 'Open folder'));
  assert.ok(calls.some((call) => call.path === '/dsh-skill-deck/reveal'), 'reveal requested');

  calls.length = 0;
  await click(buttonIn(cardFor('demo'), 'Edit'));
  assert.ok(calls.some((call) => call.path === '/dsh-skill-deck/read'), 'edit reads the file');
  assert.ok(container.querySelector('textarea'), 'editor opened from the card');
  await click(buttonByText('Cancel'));
  assert.equal(container.querySelector('textarea'), null);

  await click(buttonIn(cardFor('demo'), 'Duplicate'));
  assert.equal(container.querySelector('.deck-modal input')?.value, 'demo-copy');
  await click(buttonByText('Cancel'));

  calls.length = 0;
  await click(buttonIn(cardFor('demo'), 'Remove'));
  assert.match(container.querySelector('.deck-modal').textContent, /Type the skill name to confirm/);
  await click(buttonByText('Cancel'));
  assert.ok(!calls.some((call) => call.path === '/dsh-skill-deck/delete'), 'cancel keeps the skill');

  await click(buttonIn(cardFor('demo'), 'Tag'));
  const inputs = [...container.querySelectorAll('.deck-modal input')];
  await act(async () => {
    setValue(inputs[0], 'review');
    setValue(inputs[1], 'Dex Horthy');
  });
  await settle();
  calls.length = 0;
  await click(buttonByText('Save tags'));
  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'demo',
    category: 'review',
    author: 'Dex Horthy',
    series: '',
  });
  const reviewGroup = groupSummaries().find((group) => group.title === 'review');
  assert.deepEqual(reviewGroup, { title: 'review', count: '2', cards: ['demo', 'review-skill'] });

  await click(buttonByText('List'));
  const demoRow = rowFor('demo');
  assert.match(demoRow.textContent, /review/, 'the list row reflects the saved category');
  assert.match(demoRow.textContent, /Dex Horthy/, 'the list row reflects the saved author');
  await click(buttonByText('Cards'));
});

test('cards are named, keyboard-focusable articles and drop the annotation chips', async () => {
  const demoCard = cardFor('demo');
  assert.equal(demoCard.tagName, 'ARTICLE');
  assert.equal(demoCard.tabIndex, 0, 'the card itself is reachable by keyboard');
  assert.equal(demoCard.getAttribute('aria-label'), 'demo', 'the card has an accessible name');
  assert.equal(demoCard.querySelector('.deck-tag'), null, 'cards do not repeat the category or author chips');

  await click(buttonByText('List'));
  const tags = [...rowFor('demo').querySelectorAll('.deck-tag')].map((node) => node.textContent);
  assert.equal(tags.length, 2, 'the list row keeps the category and author chips');
  assert.match(tags.join(' '), /Category · review/);
  assert.match(tags.join(' '), /Author · Dex Horthy/);
  await click(buttonByText('Cards'));
});

test('the annotation editor pre-fills manual values only and hints at the frontmatter author', async () => {
  await click(buttonIn(cardFor('docs-skill'), 'Tag'));
  let inputs = [...container.querySelectorAll('.deck-modal input')];
  assert.equal(inputs[0].value, 'documentation', 'the manual category is pre-filled');
  assert.equal(inputs[1].value, '', 'a frontmatter-only author is not pinned as a manual value');
  assert.equal(inputs[1].placeholder, 'Docs Writer', 'the frontmatter author is shown as a hint');
  assert.equal(inputs[2].value, 'Docs', 'the manual series is pre-filled');

  calls.length = 0;
  await click(buttonByText('Save tags'));
  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'docs-skill',
    category: 'documentation',
    author: '',
    series: 'Docs',
  });

  await click(buttonIn(cardFor('docs-skill'), 'Tag'));
  inputs = [...container.querySelectorAll('.deck-modal input')];
  assert.equal(inputs[1].value, '', 'saving a category-only edit leaves the author manual value empty');
  assert.equal(inputs[1].placeholder, 'Docs Writer', 'the frontmatter fallback still applies');
  assert.equal(inputs[2].value, 'Docs', 'saving a category-only edit leaves the series manual value intact');
  await click(buttonByText('Cancel'));

  await click(buttonByText('List'));
  assert.match(rowFor('docs-skill').textContent, /Docs Writer/, 'the effective author still comes from frontmatter');
  await click(buttonByText('Cards'));

  calls.length = 0;
  await click(buttonIn(cardFor('docs-skill'), 'Model'));
  assert.ok(calls.some((call) => call.path === '/dsh-skill-deck/toggle'), 'toggle requested');
  await click(buttonIn(cardFor('docs-skill'), 'Tag'));
  inputs = [...container.querySelectorAll('.deck-modal input')];
  assert.equal(inputs[0].value, 'documentation', 'a toggle response keeps the manual category');
  assert.equal(inputs[1].value, '', 'a toggle response does not invent a manual author');
  await click(buttonByText('Cancel'));
});

test('search and the status filter narrow the working set before grouping', async () => {
  const search = container.querySelector('input[type="search"]');
  await act(async () => {
    setValue(search, 'demo');
  });
  await settle();
  assert.equal(container.querySelectorAll('.deck-card').length, 1);
  assert.deepEqual(groupSummaries(), [{ title: 'review', count: '1', cards: ['demo'] }]);

  await act(async () => {
    setValue(search, '');
  });
  await settle();

  const filter = container.querySelector('select.deck-filter');
  assert.ok(filter, 'status filter');
  await pick(filter, 'invalid');
  assert.equal(container.querySelectorAll('.deck-card').length, 1);
  assert.ok(cardFor('review-skill'), 'only the invalid skill remains');
  assert.deepEqual(groupSummaries(), [{ title: 'review', count: '1', cards: ['review-skill'] }]);
  await pick(filter, 'all');
});

test('the Cards view keeps the no-match state', async () => {
  const search = container.querySelector('input[type="search"]');
  await act(async () => {
    setValue(search, 'nope');
  });
  await settle();
  assert.equal(container.querySelectorAll('.deck-card').length, 0);
  assert.equal(container.querySelectorAll('.deck-group').length, 0);
  assert.match(container.textContent, /No matching skills/);
  await act(async () => {
    setValue(search, '');
  });
  await settle();
});

test('the view and grouping survive a remount', async () => {
  await pick(container.querySelector('select.deck-groupby'), 'root');

  const otherContainer = document.createElement('div');
  document.body.appendChild(otherContainer);
  const otherRoot = createRoot(otherContainer);
  await act(async () => {
    otherRoot.render(React.createElement(Panel));
  });
  await settle();
  await settle();
  assert.equal(otherContainer.querySelectorAll('.deck-row').length, 0, 'cards view restored');
  assert.ok(otherContainer.querySelectorAll('.deck-card').length > 0);
  assert.equal(otherContainer.querySelector('select.deck-groupby').value, 'root');
  assert.deepEqual(
    [...otherContainer.querySelectorAll('.deck-group-title')].map((node) => node.textContent.trim()),
    ['~/.agents/skills', '~/.dsh/skills'],
  );
  await act(async () => {
    otherRoot.unmount();
  });
  otherContainer.remove();

  await click(buttonByText('List'));
  const listContainer = document.createElement('div');
  document.body.appendChild(listContainer);
  const listRoot = createRoot(listContainer);
  await act(async () => {
    listRoot.render(React.createElement(Panel));
  });
  await settle();
  await settle();
  assert.equal(listContainer.querySelectorAll('.deck-row').length, 4, 'list view restored');
  assert.equal(listContainer.querySelectorAll('.deck-card').length, 0);
  assert.equal(listContainer.querySelector('select.deck-groupby').value, 'root');
  await act(async () => {
    listRoot.unmount();
  });
  listContainer.remove();
  await click(buttonByText('Cards'));
});

test('the Map always groups by series, hides the group-by selector, and shows module headers', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  calls.length = 0;
  await click(buttonByText('Refresh'));
  await pick(container.querySelector('select.deck-groupby'), 'category');
  assert.ok(buttonByText('Map'), 'map view control');

  await click(buttonByText('Map'));
  assert.equal(buttonByText('Map')?.getAttribute('aria-pressed'), 'true');
  assert.equal(buttonByText('List')?.getAttribute('aria-pressed'), 'false');
  assert.equal(buttonByText('Cards')?.getAttribute('aria-pressed'), 'false');
  assert.equal(container.querySelectorAll('.deck-row').length, 0, 'list is replaced by the map');
  assert.equal(container.querySelectorAll('.deck-card').length, 0, 'cards are replaced by the map');
  assert.ok(!container.querySelector('.deck-map-canvas'), 'the treemap canvas is gone');
  assert.ok(
    container.querySelector('select.deck-groupby') === null,
    'the group-by selector is hidden on the Map',
  );
  assert.equal(container.querySelectorAll('.deck-map-grid').length, 3, 'every module has its own grid');

  const css = document.querySelector('style[data-plugin-css="dsh-skill-deck/panel.css"]')?.textContent ?? '';
  assert.match(css, /grid-template-columns:\s*repeat\(auto-fill, minmax\(150px, 1fr\)\)/);
  assert.match(css, /\.deck-map-grid\s*\{[^}]*gap:\s*8px/);
  assert.match(css, /\.deck-map-tile\s*\{[^}]*aspect-ratio:\s*3\s*\/\s*2/);
  assert.match(css, /\.deck-map-module\s*\{[^}]*border:/, 'each series is a module card');

  assert.deepEqual(mapModules(), [
    {
      title: 'Docs',
      count: '2',
      status: '2 Enabled',
      tiles: ['docs-skill', 'lint-skill'],
      unassigned: false,
      empty: false,
    },
    {
      title: 'Reviewers',
      count: '1',
      status: '1 Needs fixing',
      tiles: ['review-skill'],
      unassigned: false,
      empty: false,
    },
    {
      title: 'Unassigned',
      count: '1',
      status: '1 Enabled',
      tiles: ['demo'],
      unassigned: true,
      empty: false,
    },
  ]);

  await click(buttonByText('Cards'));
  const groupBy = container.querySelector('select.deck-groupby');
  assert.ok(groupBy, 'the Cards view restores the group-by selector');
  assert.equal(groupBy.value, 'category', 'the Cards grouping preference is preserved');
  await pick(groupBy, 'author');
  await click(buttonByText('Map'));
  assert.ok(container.querySelector('select.deck-groupby') === null);
  assert.deepEqual(mapModules().map((module) => module.title), ['Docs', 'Reviewers', 'Unassigned']);
  await click(buttonByText('Cards'));
  assert.equal(container.querySelector('select.deck-groupby').value, 'author');
  await pick(container.querySelector('select.deck-groupby'), 'category');
  await click(buttonByText('Map'));
});

test('series modules order by count then name, unassigned stays last, and tiles sort by name', async () => {
  profile = {
    ...JSON.parse(JSON.stringify(baseProfile)),
    skills: [
      {
        ...baseProfile.skills[1],
        name: 'zeta-skill',
        category: 'shared',
        manualCategory: 'shared',
        series: 'Shared',
        manualSeries: 'Shared',
      },
      {
        ...baseProfile.skills[1],
        name: 'alpha-skill',
        category: 'shared',
        manualCategory: 'shared',
        series: 'shared',
        manualSeries: 'shared',
      },
      {
        ...baseProfile.skills[1],
        name: 'solo-skill',
        category: 'alpha-cat',
        manualCategory: 'alpha-cat',
        series: 'alpha-cat',
        manualSeries: 'alpha-cat',
      },
      {
        ...baseProfile.skills[1],
        name: 'beta-skill',
        category: 'Beta',
        manualCategory: 'Beta',
        series: 'Beta',
        manualSeries: 'Beta',
      },
      {
        ...baseProfile.skills[0],
        name: 'loose-skill',
        category: 'Uncategorized',
        manualCategory: '',
        series: '',
        manualSeries: '',
      },
    ],
    totals: { ...baseProfile.totals, skills: 5 },
  };
  await click(buttonByText('Refresh'));
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.count, module.tiles]),
    [
      ['Shared', '2', ['alpha-skill', 'zeta-skill']],
      ['alpha-cat', '1', ['solo-skill']],
      ['Beta', '1', ['beta-skill']],
      ['Unassigned', '1', ['loose-skill']],
    ],
    'series compare case-insensitively but display the first spelling seen',
  );
  assert.deepEqual(
    mapModules().map((module) => module.unassigned),
    [false, false, false, true],
    'the unassigned module renders last',
  );

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
  assert.deepEqual(
    mapModules().map((module) => module.title),
    ['Docs', 'Reviewers', 'Unassigned'],
  );
});

test('the unassigned module appears last and collapses to a slim drop zone when empty', async () => {
  const assigned = JSON.parse(JSON.stringify(baseProfile));
  assigned.skills = assigned.skills.map((skill) =>
    skill.name === 'demo'
      ? { ...skill, series: 'Loose Ends', manualSeries: 'Loose Ends' }
      : skill,
  );
  profile = assigned;
  await click(buttonByText('Refresh'));

  const modules = mapModules();
  assert.deepEqual(
    modules.map((module) => [module.title, module.count, module.unassigned, module.empty]),
    [
      ['Docs', '2', false, false],
      ['Loose Ends', '1', false, false],
      ['Reviewers', '1', false, false],
      ['Unassigned', '0', true, true],
    ],
  );
  const empty = mapModuleFor('Unassigned');
  assert.ok(empty, 'the unassigned module still renders when empty');
  assert.ok(empty.classList.contains('is-empty'));
  assert.equal(empty.querySelectorAll('.deck-map-tile').length, 0, 'the empty module has no tiles');
  assert.ok(empty.querySelector('.deck-map-grid') === null, 'the empty module collapses its grid');
  assert.match(empty.querySelector('.deck-map-dropzone')?.textContent ?? '', /Drag a skill here/);
  assert.equal(buttonInScope(empty, 'Rename'), undefined, 'Unassigned is not a renameable series');

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
  assert.equal(mapModuleFor('Unassigned').classList.contains('is-empty'), false);
});

test('renaming a series from its module header updates every member in one request', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));

  const docsModule = mapModuleFor('Docs');
  assert.ok(docsModule, 'the Docs module rendered');
  calls.length = 0;
  await click(buttonInScope(docsModule, 'Rename'));

  const dialog = container.querySelector('.deck-modal');
  assert.ok(dialog, 'module rename is an ordinary dialog');
  assert.match(dialog.textContent, /Rename series/);
  const input = dialog.querySelector('input');
  assert.equal(input.value, 'Docs', 'the current series name is pre-filled');
  await act(async () => {
    setValue(input, 'Documentation');
  });
  await settle();
  await click(buttonInScope(dialog, 'Rename'));

  const annotates = calls.filter((call) => call.path === '/dsh-skill-deck/annotate');
  assert.equal(annotates.length, 1, 'the whole series is renamed in one request');
  assert.deepEqual(annotates[0]?.body, {
    name: 'docs-skill',
    previousSeries: 'Docs',
    series: 'Documentation',
  });
  assert.equal(container.querySelector('.deck-modal'), null, 'the dialog closes');
  assert.match(container.textContent, /Series renamed/);
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.count, module.tiles]),
    [
      ['Documentation', '2', ['docs-skill', 'lint-skill']],
      ['Reviewers', '1', ['review-skill']],
      ['Unassigned', '1', ['demo']],
    ],
    'every member moved to the new series name',
  );

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('map tiles encode invalid > disabled > enabled status with tints, dots and visible counts', async () => {
  profile = {
    ...JSON.parse(JSON.stringify(baseProfile)),
    skills: [
      {
        ...baseProfile.skills[0],
        name: 'broken-disabled',
        category: 'status',
        manualCategory: 'status',
        series: 'status',
        manualSeries: 'status',
        valid: false,
        error: 'bad frontmatter',
        modelInvocable: false,
        userInvocable: false,
      },
      {
        ...baseProfile.skills[0],
        name: 'broken-enabled',
        category: 'status',
        manualCategory: 'status',
        series: 'status',
        manualSeries: 'status',
        valid: false,
        error: 'bad frontmatter',
        modelInvocable: true,
        userInvocable: true,
      },
      {
        ...baseProfile.skills[0],
        name: 'off-skill',
        category: 'status',
        manualCategory: 'status',
        series: 'status',
        manualSeries: 'status',
        valid: true,
        error: null,
        modelInvocable: false,
        userInvocable: false,
      },
      {
        ...baseProfile.skills[0],
        name: 'on-skill',
        category: 'status',
        manualCategory: 'status',
        series: 'status',
        manualSeries: 'status',
        valid: true,
        error: null,
        modelInvocable: true,
        userInvocable: false,
      },
    ],
    totals: { skills: 4, modelInvocable: 2, userInvocable: 1, invalid: 2 },
  };
  await click(buttonByText('Refresh'));

  assert.deepEqual(statusLegend(), [
    ['Needs fixing', '2'],
    ['Disabled', '1'],
    ['Enabled', '1'],
  ]);
  assert.deepEqual(
    legendEntries().map((entry) => entry.status),
    ['invalid', 'disabled', 'enabled'],
    'the legend always exposes exactly three statuses',
  );

  const expected = {
    'broken-disabled': 'invalid',
    'broken-enabled': 'invalid',
    'off-skill': 'disabled',
    'on-skill': 'enabled',
  };
  for (const [name, status] of Object.entries(expected)) {
    const tile = mapTileFor(name);
    assert.equal(tile.dataset.status, status, name + ' status');
    assert.ok(tile.classList.contains('status-' + status), name + ' status class');
    const dot = tile.querySelector('.deck-status-dot');
    assert.ok(dot, name + ' has a status dot');
    assert.equal(dot.dataset.status, status);
    assert.equal(
      dot.style.backgroundColor,
      legendEntries().find((entry) => entry.status === status)?.color,
      name + ' dot matches its legend swatch',
    );
  }
  assert.match(mapTileFor('broken-disabled').textContent, /Needs fixing/, 'invalid wins over disabled');

  const tints = ['broken-enabled', 'off-skill', 'on-skill'].map(
    (name) => mapTileFor(name).style.backgroundColor,
  );
  assert.equal(new Set(tints).size, 3, 'each status has its own tint');
  for (const tile of mapTiles()) {
    const dot = tile.querySelector('.deck-status-dot');
    assert.notEqual(tile.style.backgroundColor, dot.style.backgroundColor, 'the tint and the solid dot differ');
  }

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('search and the status filter narrow series modules and the legend before grouping', async () => {
  const search = container.querySelector('input[type="search"]');
  await act(async () => {
    setValue(search, 'demo');
  });
  await settle();
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.count, module.tiles]),
    [['Unassigned', '1', ['demo']]],
    'the matching unassigned module is the only populated module',
  );
  assert.deepEqual(statusLegend(), [
    ['Needs fixing', '0'],
    ['Disabled', '0'],
    ['Enabled', '1'],
  ]);

  await act(async () => {
    setValue(search, '');
  });
  await settle();

  await pick(container.querySelector('select.deck-filter'), 'invalid');
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.count, module.tiles, module.empty]),
    [
      ['Reviewers', '1', ['review-skill'], false],
      ['Unassigned', '0', [], true],
    ],
    'the empty unassigned drop zone remains while the visible module shrinks',
  );
  assert.deepEqual(statusLegend(), [
    ['Needs fixing', '1'],
    ['Disabled', '0'],
    ['Enabled', '0'],
  ]);
  await pick(container.querySelector('select.deck-filter'), 'all');
  assert.equal(mapTiles().length, 4, 'clearing the filter restores every tile');
  assert.deepEqual(statusLegend(), [
    ['Needs fixing', '1'],
    ['Disabled', '0'],
    ['Enabled', '3'],
  ]);
});

test('a desktop tile click opens the editor and the map exposes no destructive actions', async () => {
  const tiles = mapTiles();
  assert.equal(tiles.length, 4);
  for (const tile of tiles) {
    assert.equal(tile.tagName, 'BUTTON', 'every tile is a button');
    assert.ok(tile.classList.contains('deck-map-tile'));
    assert.equal(tile.style.width, '', 'tiles get their size from the grid, not inline geometry');
    assert.equal(tile.style.height, '');
    assert.equal(tile.style.left, '');
    assert.equal(tile.style.top, '');
    assert.equal(tile.getAttribute('title'), tile.dataset.skill, 'the full name is a native hover title');
    assert.match(tile.getAttribute('aria-label') || '', new RegExp(tile.dataset.skill));
    assert.match(tile.getAttribute('aria-label') || '', /\d+ B/);
  }
  const demoTile = mapTileFor('demo');
  assert.match(demoTile.textContent, /demo/);
  assert.match(demoTile.textContent, /Model/);
  assert.match(demoTile.textContent, /Slash/);
  assert.match(demoTile.textContent, /64 B/);
  const docsSlash = [...mapTileFor('docs-skill').querySelectorAll('.deck-badge')].find(
    (badge) => badge.textContent === 'Slash',
  );
  assert.ok(docsSlash, 'both surface badges are always shown');
  assert.ok(docsSlash.classList.contains('muted'), 'the inactive surface is muted');
  assert.match(mapTileFor('docs-skill').textContent, /128 B/);
  assert.match(mapTileFor('review-skill').textContent, /Needs fixing/, 'the invalid marker stays on the tile');

  const mapButtons = [...container.querySelectorAll('.deck-map button')];
  for (const button of mapButtons) {
    assert.ok(
      button.classList.contains('deck-map-tile') || button.classList.contains('deck-map-rename'),
      'the Map only exposes tiles and series rename actions: ' + button.textContent,
    );
  }
  assert.equal(
    container.querySelectorAll('.deck-map-module .deck-map-rename').length,
    2,
    'each named series module has one rename action',
  );
  assert.equal(container.querySelector('.deck-map .deck-btn.danger'), null, 'no destructive control');
  assert.equal(container.querySelector('.deck-map-strip'), null, 'no details strip on desktop');
  assert.doesNotMatch(
    container.querySelector('.deck-map').textContent,
    /Remove|Duplicate|Tag|Open folder/,
    'the map offers no row actions',
  );

  calls.length = 0;
  await click(mapTileFor('demo'));
  const read = calls.find((call) => call.path === '/dsh-skill-deck/read');
  assert.deepEqual(read?.body, { name: 'demo' }, 'the map tile reads its skill');
  assert.ok(container.querySelector('textarea'), 'editor opened from the map');
  await click(buttonByText('Cancel'));
  assert.equal(container.querySelector('textarea'), null, 'editor closed');
});

test('the map overlay shows measured details on hover and focus, flipping and clamping', async () => {
  const restoreGeometry = stubMapGeometry({
    demo: { left: 100, top: 100, width: 150, height: 100 },
    'docs-skill': { left: 900, top: 100, width: 150, height: 100 },
    'lint-skill': { left: 100, top: 700, width: 150, height: 100 },
  });
  try {
    assert.equal(container.querySelector('.deck-map-popover'), null, 'no overlay before hover');

    await hover(mapTileFor('demo'));
    let popover = container.querySelector('.deck-map-popover');
    assert.ok(popover, 'hover shows the overlay');
    assert.equal(popover.dataset.placement, 'below');
    assert.equal(popover.style.top, '208px', 'anchored just below the measured tile');
    assert.equal(popover.style.left, '100px');
    assert.match(popover.textContent, /demo/);
    assert.match(popover.textContent, /A demo skill\./);
    assert.match(popover.textContent, /1 files · 64 B/);
    assert.match(popover.textContent, /~\/\.dsh\/skills/);
    assert.match(popover.textContent, /Category · Uncategorized/);
    assert.match(popover.textContent, /Author · Unknown/);
    assert.match(popover.textContent, /Series · Unassigned/);

    await unhover(mapTileFor('demo'));
    assert.equal(container.querySelector('.deck-map-popover'), null, 'leaving hides the overlay');

    await focusNode(mapTileFor('docs-skill'));
    popover = container.querySelector('.deck-map-popover');
    assert.ok(popover, 'focus shows the overlay');
    assert.equal(popover.style.left, '756px', 'clamped to the right viewport edge');
    assert.equal(popover.style.top, '208px');
    assert.match(popover.textContent, /128 B/);
    assert.match(popover.textContent, /Series · Docs/);
    await blurActive();
    assert.equal(container.querySelector('.deck-map-popover'), null, 'blur hides the overlay');

    await focusNode(mapTileFor('lint-skill'));
    popover = container.querySelector('.deck-map-popover');
    assert.ok(popover, 'focus shows the overlay');
    assert.equal(popover.dataset.placement, 'above', 'flips above when there is no room below');
    assert.equal(popover.style.top, '552px');
    await blurActive();
  } finally {
    restoreGeometry();
  }
});

test('narrow or touch layouts select on the first tap and open on Edit or a second tap', async () => {
  const restoreMatchMedia = stubCompactLayout();
  const otherContainer = document.createElement('div');
  document.body.appendChild(otherContainer);
  const otherRoot = createRoot(otherContainer);
  try {
    await act(async () => {
      otherRoot.render(React.createElement(Panel));
    });
    await settle();
    await settle();

    const mapButton = buttonInScope(otherContainer, 'Map');
    assert.ok(mapButton, 'map view control');
    if (mapButton.getAttribute('aria-pressed') !== 'true') await click(mapButton);
    assert.ok(otherContainer.querySelector('.deck-map'), 'the map is rendered in the compact layout');

    const strip = otherContainer.querySelector('.deck-map-strip');
    assert.ok(strip, 'a details strip replaces the overlay');
    assert.match(strip.textContent, /Tap a skill to see details/);

    await hover(mapTileFor('demo', otherContainer));
    assert.equal(otherContainer.querySelector('.deck-map-popover'), null, 'hover does not open an overlay');

    calls.length = 0;
    await click(mapTileFor('demo', otherContainer));
    assert.equal(otherContainer.querySelector('textarea'), null, 'the first tap only selects');
    assert.match(otherContainer.querySelector('.deck-map-strip').textContent, /demo/);
    assert.match(otherContainer.querySelector('.deck-map-strip').textContent, /A demo skill\./);
    assert.match(otherContainer.querySelector('.deck-map-strip').textContent, /1 files · 64 B/);
    assert.match(otherContainer.querySelector('.deck-map-strip').textContent, /Series · Unassigned/);
    assert.ok(
      !calls.some((call) => call.path === '/dsh-skill-deck/read'),
      'the first tap does not read the file',
    );

    const edit = buttonInScope(otherContainer.querySelector('.deck-map-strip'), 'Edit');
    assert.ok(edit, 'the strip exposes an Edit action');
    await click(edit);
    assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/read')?.body, { name: 'demo' });
    assert.ok(otherContainer.querySelector('textarea'), 'Edit opens the editor');
    await click(buttonInScope(otherContainer, 'Cancel'));
    assert.equal(otherContainer.querySelector('textarea'), null);

    await click(mapTileFor('docs-skill', otherContainer));
    assert.match(otherContainer.querySelector('.deck-map-strip').textContent, /docs-skill/);
    assert.equal(otherContainer.querySelector('textarea'), null, 'selecting another tile still only selects');
    calls.length = 0;
    await click(mapTileFor('docs-skill', otherContainer));
    assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/read')?.body, {
      name: 'docs-skill',
    });
    assert.ok(otherContainer.querySelector('textarea'), 'a second tap opens the editor');
    await click(buttonInScope(otherContainer, 'Cancel'));
  } finally {
    await act(async () => {
      otherRoot.unmount();
    });
    otherContainer.remove();
    restoreMatchMedia();
  }
});

test('the Map view hides the grid and legend when nothing matches', async () => {
  const search = container.querySelector('input[type="search"]');
  await act(async () => {
    setValue(search, 'nope');
  });
  await settle();
  assert.equal(container.querySelector('.deck-map'), null);
  assert.equal(mapTiles().length, 0);
  assert.equal(legendEntries().length, 0);
  assert.match(container.textContent, /No matching skills/);

  await act(async () => {
    setValue(search, '');
  });
  await settle();
  assert.equal(mapTiles().length, 4, 'clearing the search restores every tile');
  assert.equal(legendEntries().length, 3, 'the three-item status legend returns');
});

test('the Map view keeps the empty state when the deck has no skills', async () => {
  profile = {
    ...JSON.parse(JSON.stringify(baseProfile)),
    skills: [],
    totals: { skills: 0, modelInvocable: 0, userInvocable: 0, invalid: 0 },
  };
  await click(buttonByText('Refresh'));
  assert.match(container.textContent, /No skills yet/);
  assert.equal(container.querySelector('.deck-map'), null);
  assert.equal(mapTiles().length, 0);
  assert.equal(legendEntries().length, 0);

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
  assert.equal(mapTiles().length, 4);
});

test('the Map view and the Cards grouping survive a remount', async () => {
  await click(buttonByText('Cards'));
  await pick(container.querySelector('select.deck-groupby'), 'author');
  await click(buttonByText('Map'));

  const otherContainer = document.createElement('div');
  document.body.appendChild(otherContainer);
  const otherRoot = createRoot(otherContainer);
  await act(async () => {
    otherRoot.render(React.createElement(Panel));
  });
  await settle();
  await settle();
  assert.ok(otherContainer.querySelector('.deck-map'), 'map view restored');
  assert.equal(otherContainer.querySelectorAll('.deck-map-tile').length, 4);
  assert.ok(
    otherContainer.querySelector('select.deck-groupby') === null,
    'the Map restores without a group-by selector',
  );
  assert.deepEqual(
    mapModules(otherContainer).map((module) => [module.title, module.count]),
    [
      ['Docs', '2'],
      ['Reviewers', '1'],
      ['Unassigned', '1'],
    ],
  );
  assert.deepEqual(
    [...otherContainer.querySelectorAll('.deck-legend-label')].map((node) => node.textContent.trim()),
    ['Needs fixing', 'Disabled', 'Enabled'],
  );

  await click(buttonInScope(otherContainer, 'Cards'));
  assert.equal(otherContainer.querySelector('select.deck-groupby').value, 'author');
  assert.deepEqual(
    [...otherContainer.querySelectorAll('.deck-group-title')].map((node) => node.textContent.trim()),
    ['Docs Writer', 'Dex Horthy', 'Unknown'],
    'the Cards grouping preference is still intact',
  );
  await act(async () => {
    otherRoot.unmount();
  });
  otherContainer.remove();

  await click(buttonByText('Cards'));
  assert.equal(container.querySelector('select.deck-groupby').value, 'author');
  await pick(container.querySelector('select.deck-groupby'), 'category');
  await click(buttonByText('Map'));
});

test('the Map view keeps loading and error states usable', async () => {
  const realFetch = globalThis.fetch;
  const makeContainer = () => {
    const node = document.createElement('div');
    document.body.appendChild(node);
    return { node, root: createRoot(node) };
  };

  try {
    globalThis.fetch = (url, init) =>
      String(url).endsWith('/state') ? new Promise(() => {}) : realFetch(url, init);
    const loading = makeContainer();
    await act(async () => {
      loading.root.render(React.createElement(Panel));
    });
    await settle();
    assert.match(loading.node.textContent, /Reading skills/);
    assert.equal(loading.node.querySelectorAll('.deck-view .deck-btn').length, 3, 'view switcher stays usable');
    await act(async () => {
      loading.root.unmount();
    });
    loading.node.remove();

    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith('/state')) {
        return { ok: false, status: 500, json: async () => ({ ok: false, error: 'boom' }) };
      }
      return realFetch(url, init);
    };
    const error = makeContainer();
    await act(async () => {
      error.root.render(React.createElement(Panel));
    });
    await settle();
    assert.match(error.node.textContent, /Could not load skills/);
    assert.match(error.node.textContent, /boom/);
    const retry = [...error.node.querySelectorAll('button')].find((node) => node.textContent?.trim() === 'Retry');
    assert.ok(retry, 'retry action rendered');

    globalThis.fetch = realFetch;
    await act(async () => {
      retry.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    });
    await settle();
    assert.ok(error.node.querySelector('.deck-map'), 'retry recovers into the map view');
    await act(async () => {
      error.root.unmount();
    });
    error.node.remove();
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('dragging a tile onto a series module moves it optimistically and offers undo', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  calls.length = 0;
  await click(buttonByText('Refresh'));
  await ensureMapView();

  const release = gateAnnotate();
  const data = await dragStart(mapTileFor('demo'));
  await dragOver(mapModuleFor('Docs'), data);
  await dropOn(mapModuleFor('Docs'), data);

  // The write is still pending; the tile already sits in Docs.
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.count, module.tiles]),
    [
      ['Docs', '3', ['demo', 'docs-skill', 'lint-skill']],
      ['Reviewers', '1', ['review-skill']],
      ['Unassigned', '0', []],
    ],
    'the board updates before the request resolves',
  );
  release();
  await settle();

  const annotate = calls.find((call) => call.path === '/dsh-skill-deck/annotate');
  assert.deepEqual(annotate?.body, { name: 'demo', series: 'Docs' });

  const toast = container.querySelector('.deck-toast');
  assert.ok(toast, 'a success toast appears');
  assert.match(toast.textContent, /Moved to/);
  assert.match(toast.textContent, /Docs/);
  const undo = buttonInScope(toast, 'Undo');
  assert.ok(undo, 'the success toast offers undo');

  calls.length = 0;
  await click(undo);
  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'demo',
    series: '',
  });
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.tiles]),
    [
      ['Docs', ['docs-skill', 'lint-skill']],
      ['Reviewers', ['review-skill']],
      ['Unassigned', ['demo']],
    ],
    'undo restores the previous series',
  );
  assert.match(container.querySelector('.deck-toast')?.textContent ?? '', /Move undone/);

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('dropping a tile on the unassigned module clears its series and undo restores it', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  calls.length = 0;
  await click(buttonByText('Refresh'));
  await ensureMapView();

  const data = await dragStart(mapTileFor('docs-skill'));
  await dragOver(mapModuleFor('Unassigned'), data);
  await dropOn(mapModuleFor('Unassigned'), data);

  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'docs-skill',
    series: '',
  });
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.tiles]),
    [
      ['docs', ['lint-skill']],
      ['Reviewers', ['review-skill']],
      ['Unassigned', ['demo', 'docs-skill']],
    ],
    'the skill leaves its module and joins the unassigned bucket; the remaining spelling wins',
  );
  assert.match(container.querySelector('.deck-toast')?.textContent ?? '', /Removed from series/);

  const undo = buttonInScope(container.querySelector('.deck-toast'), 'Undo');
  calls.length = 0;
  await click(undo);
  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'docs-skill',
    series: 'Docs',
  });
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.tiles]),
    [
      ['Docs', ['docs-skill', 'lint-skill']],
      ['Reviewers', ['review-skill']],
      ['Unassigned', ['demo']],
    ],
    'undo restores the previous series',
  );

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('the new-series drop zone opens a name dialog and creates or reuses a series', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  calls.length = 0;
  await click(buttonByText('Refresh'));
  await ensureMapView();

  const zone = container.querySelector('.deck-map-newseries');
  assert.ok(zone, 'the board exposes a new-series drop zone');
  const data = await dragStart(mapTileFor('demo'));
  await dragOver(zone, data);
  await dropOn(zone, data);

  let dialog = container.querySelector('.deck-modal');
  assert.ok(dialog, 'dropping on the zone opens a name dialog');
  assert.match(dialog.textContent, /New series/);
  assert.match(dialog.textContent, /demo/);
  const input = dialog.querySelector('input');
  const options = [...dialog.querySelectorAll('datalist option')].map((option) => option.value);
  assert.ok(options.includes('Docs'), 'existing series are offered: ' + options.join(','));
  assert.equal(input.value, '', 'the field starts empty');

  await act(async () => {
    setValue(input, 'Fresh Series');
  });
  await settle();
  calls.length = 0;
  await click(buttonInScope(dialog, 'Create and move'));

  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'demo',
    series: 'Fresh Series',
  });
  assert.equal(container.querySelector('.deck-modal'), null, 'the dialog closes after the move');
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.tiles]),
    [
      ['Docs', ['docs-skill', 'lint-skill']],
      ['Fresh Series', ['demo']],
      ['Reviewers', ['review-skill']],
      ['Unassigned', []],
    ],
    'the dropped skill created and joined the new series',
  );

  // Typing a differently-cased existing name selects that series instead of
  // creating a near-duplicate.
  const second = await dragStart(mapTileFor('review-skill'));
  await dragOver(container.querySelector('.deck-map-newseries'), second);
  await dropOn(container.querySelector('.deck-map-newseries'), second);
  dialog = container.querySelector('.deck-modal');
  assert.ok(dialog, 'the dialog opens for the second drop');
  await act(async () => {
    setValue(dialog.querySelector('input'), 'docs');
  });
  await settle();
  calls.length = 0;
  await click(buttonInScope(dialog, 'Create and move'));
  assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
    name: 'review-skill',
    series: 'Docs',
  });
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.tiles]),
    [
      ['Docs', ['docs-skill', 'lint-skill', 'review-skill']],
      ['Fresh Series', ['demo']],
      ['Unassigned', []],
    ],
    'the existing series absorbed the skill',
  );

  // Cancel is a real escape hatch: no write, no move.
  const third = await dragStart(mapTileFor('lint-skill'));
  await dragOver(container.querySelector('.deck-map-newseries'), third);
  await dropOn(container.querySelector('.deck-map-newseries'), third);
  calls.length = 0;
  await click(buttonInScope(container.querySelector('.deck-modal'), 'Cancel'));
  assert.equal(container.querySelector('.deck-modal'), null);
  assert.ok(!calls.some((call) => call.path === '/dsh-skill-deck/annotate'), 'cancel writes nothing');

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('dragging highlights the target, dims other modules, labels the drop and auto-scrolls', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  calls.length = 0;
  await click(buttonByText('Refresh'));
  await ensureMapView();

  const restoreGeometry = stubBoardGeometry({ top: 100, height: 400 });
  const scrollCalls = [];
  const originalScrollBy = dom.window.scrollBy;
  dom.window.scrollBy = (...args) => {
    scrollCalls.push(args);
  };
  try {
    const data = await dragStart(mapTileFor('demo'));
    assert.ok(container.querySelector('.deck-map').classList.contains('is-dragging'));
    assert.equal(
      container.querySelectorAll('.deck-map-module.is-dimmed').length,
      3,
      'every module recedes before a target is hovered',
    );

    await dragOver(mapModuleFor('Docs'), data, { clientY: 120 });
    const target = mapModuleFor('Docs');
    assert.ok(target.classList.contains('is-drop-target'), 'the target module is highlighted');
    assert.equal(target.dataset.dropTarget, 'true');
    const label = target.querySelector('.deck-map-drop-label');
    assert.ok(label, 'the target shows a drop label');
    assert.equal(label.textContent.trim(), 'Assign to · Docs', 'the label names the target series');
    for (const title of ['Reviewers', 'Unassigned']) {
      assert.ok(mapModuleFor(title).classList.contains('is-dimmed'), title + ' is dimmed');
      assert.notEqual(mapModuleFor(title).dataset.dropTarget, 'true');
    }
    assert.ok(scrollCalls.some((args) => args[1] < 0), 'hovering the top edge scrolls up');

    scrollCalls.length = 0;
    await dragOver(mapModuleFor('Docs'), data, { clientY: 480 });
    assert.ok(scrollCalls.some((args) => args[1] > 0), 'hovering the bottom edge scrolls down');

    scrollCalls.length = 0;
    await dragOver(mapModuleFor('Docs'), data, { clientY: 300 });
    assert.equal(scrollCalls.length, 0, 'the middle of the board does not auto-scroll');

    await dragOver(mapModuleFor('Unassigned'), data, { clientY: 300 });
    const unassignedLabel = mapModuleFor('Unassigned').querySelector('.deck-map-drop-label');
    assert.equal(unassignedLabel?.textContent.trim(), 'Remove from series');
    assert.ok(!mapModuleFor('Docs').classList.contains('is-drop-target'));

    await dragEnd(mapTileFor('demo'), data);
    assert.equal(container.querySelector('.deck-map-module.is-drop-target'), null);
    assert.equal(container.querySelector('.deck-map-module.is-dimmed'), null);
    assert.equal(container.querySelector('.deck-map-drop-label'), null);
    assert.ok(!container.querySelector('.deck-map').classList.contains('is-dragging'));
    assert.deepEqual(mapModules().map((module) => module.tiles), [
      ['docs-skill', 'lint-skill'],
      ['review-skill'],
      ['demo'],
    ]);
  } finally {
    restoreGeometry();
    dom.window.scrollBy = originalScrollBy;
  }
});

test('a failed move rolls the board back and shows an error toast', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  calls.length = 0;
  await click(buttonByText('Refresh'));
  await ensureMapView();

  annotateFailure = { status: 500, message: 'write failed' };
  const data = await dragStart(mapTileFor('demo'));
  await dragOver(mapModuleFor('Docs'), data);
  await dropOn(mapModuleFor('Docs'), data);
  await settle();

  assert.ok(mapTileFor('demo', mapModuleFor('Unassigned')), 'the tile returns to Unassigned');
  assert.equal(mapTileFor('demo', mapModuleFor('Docs')), undefined);
  assert.deepEqual(
    mapModules().map((module) => [module.title, module.count]),
    [
      ['Docs', '2'],
      ['Reviewers', '1'],
      ['Unassigned', '1'],
    ],
    'the board is unchanged after the rollback',
  );
  const toast = container.querySelector('.deck-toast');
  assert.ok(toast, 'an error toast appears');
  assert.ok(toast.classList.contains('error'));
  assert.match(toast.textContent, /write failed/);
  assert.equal(buttonInScope(toast, 'Undo'), undefined, 'a failed move offers no undo');
  assert.equal(annotateFailure, null, 'the injected failure was consumed');

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('only skill tiles are draggable, and a same-series drop neither reorders nor writes', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
  await ensureMapView();

  for (const tile of mapTiles()) {
    assert.equal(tile.getAttribute('draggable'), 'true', 'every skill tile is draggable');
  }
  for (const module of [...container.querySelectorAll('.deck-map-module')]) {
    assert.notEqual(module.getAttribute('draggable'), 'true', 'modules are not draggable');
    assert.ok(!module.classList.contains('deck-map-tile'));
  }
  const zone = container.querySelector('.deck-map-newseries');
  assert.notEqual(zone.getAttribute('draggable'), 'true', 'the new-series zone is a drop target only');

  calls.length = 0;
  const data = await dragStart(mapTileFor('lint-skill'));
  await dragOver(mapModuleFor('Docs'), data);
  await dropOn(mapModuleFor('Docs'), data);
  await settle();
  assert.ok(
    !calls.some((call) => call.path === '/dsh-skill-deck/annotate'),
    'dropping inside the current series is a no-op',
  );
  assert.deepEqual(mapModules()[0].tiles, ['docs-skill', 'lint-skill'], 'tile order is untouched');
  assert.doesNotMatch(
    container.querySelector('.deck-toast')?.textContent ?? '',
    /Moved to/,
    'a no-op does not announce a move',
  );
});

test('the touch strip Move to series action and the keyboard path reach the annotation dialog', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
  const restoreMatchMedia = stubCompactLayout();
  const otherContainer = document.createElement('div');
  document.body.appendChild(otherContainer);
  const otherRoot = createRoot(otherContainer);
  try {
    await act(async () => {
      otherRoot.render(React.createElement(Panel));
    });
    await settle();
    await settle();
    await ensureMapView(otherContainer);
    assert.ok(otherContainer.querySelector('.deck-map-strip'), 'compact layout shows the details strip');

    // Tiles are buttons, so keyboard users can select one with Enter/Space.
    assert.equal(mapTileFor('demo', otherContainer).tagName, 'BUTTON');
    await click(mapTileFor('demo', otherContainer));
    const strip = otherContainer.querySelector('.deck-map-strip');
    assert.match(strip.textContent, /demo/);

    const move = buttonInScope(strip, 'Move to series');
    assert.ok(move, 'the strip exposes Move to series');
    await focusNode(move);
    assert.equal(document.activeElement, move, 'the action is keyboard reachable');

    calls.length = 0;
    await click(move);
    const dialog = otherContainer.querySelector('.deck-modal');
    assert.ok(dialog, 'Move to series opens the annotation dialog');
    const inputs = [...dialog.querySelectorAll('input')];
    assert.equal(inputs.length, 3, 'the dialog keeps the category, author and series fields');
    await act(async () => {
      setValue(inputs[2], 'Docs');
    });
    await settle();
    await click(buttonInScope(dialog, 'Save tags'));

    assert.deepEqual(calls.find((call) => call.path === '/dsh-skill-deck/annotate')?.body, {
      name: 'demo',
      category: '',
      author: '',
      series: 'Docs',
    });
    assert.deepEqual(
      mapModules(otherContainer).map((module) => [module.title, module.tiles]),
      [
        ['Docs', ['demo', 'docs-skill', 'lint-skill']],
        ['Reviewers', ['review-skill']],
        ['Unassigned', []],
      ],
      'the non-drag path moves the skill without a drag',
    );
  } finally {
    await act(async () => {
      otherRoot.unmount();
    });
    otherContainer.remove();
    restoreMatchMedia();
    profile = JSON.parse(JSON.stringify(baseProfile));
    await click(buttonByText('Refresh'));
  }
});

test('cleanup', async () => {
  await act(async () => {
    root.unmount();
  });
});
