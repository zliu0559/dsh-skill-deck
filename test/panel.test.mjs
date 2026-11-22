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
  if (path === '/dsh-skill-deck/annotate') {
    const fallbackAuthors = {
      demo: 'Unknown',
      'docs-skill': 'Docs Writer',
      'lint-skill': 'docs writer',
      'review-skill': 'Dex Horthy',
    };
    profile = {
      ...profile,
      skills: profile.skills.map((skill) => {
        if (skill.name !== body.name) return skill;
        const category = body.category.trim();
        const author = body.author.trim();
        return {
          ...skill,
          category: category || 'Uncategorized',
          author: author || fallbackAuthors[skill.name] || 'Unknown',
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

function mapBlocks(scope = container) {
  return [...scope.querySelectorAll('.deck-map-block')];
}

function mapBlockFor(name, scope = container) {
  return mapBlocks(scope).find((block) => block.dataset.skill === name);
}

function blockArea(block) {
  assert.ok(block, 'map block exists');
  return parseFloat(block.style.width) * parseFloat(block.style.height);
}

function legendEntries(scope = container) {
  return [...scope.querySelectorAll('.deck-legend-item')].map((item) => ({
    label: item.querySelector('.deck-legend-label')?.textContent?.trim(),
    count: item.querySelector('.deck-legend-count')?.textContent?.trim(),
    color: item.querySelector('.deck-legend-swatch')?.style.backgroundColor,
  }));
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
  assert.equal(inputs.length, 2, 'category and author fields');
  const suggestions = [...dialog.querySelectorAll('datalist option')].map((option) => option.value);
  assert.ok(suggestions.includes('documentation'), 'existing category is suggested: ' + suggestions.join(','));

  await act(async () => {
    setValue(inputs[0], 'review');
    setValue(inputs[1], 'Dex Horthy');
  });
  await settle();
  calls.length = 0;
  await click(buttonByText('Save tags'));

  const annotate = calls.find((call) => call.path === '/dsh-skill-deck/annotate');
  assert.deepEqual(annotate?.body, { name: 'demo', category: 'review', author: 'Dex Horthy' });
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
  await act(async () => {
    setValue(inputs[0], '');
    setValue(inputs[1], '');
  });
  await settle();
  calls.length = 0;
  await click(buttonByText('Save tags'));
  const annotate = calls.find((call) => call.path === '/dsh-skill-deck/annotate');
  assert.deepEqual(annotate?.body, { name: 'demo', category: '', author: '' });
  assert.match(rowFor('demo').textContent, /Uncategorized/);
  assert.match(rowFor('demo').textContent, /Unknown/);
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
      ['user-agents', '2'],
      ['user-dsh', '2'],
    ],
  );

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
  });
  assert.match(cardFor('demo').textContent, /review/);
  assert.match(cardFor('demo').textContent, /Dex Horthy/);
  const reviewGroup = groupSummaries().find((group) => group.title === 'review');
  assert.deepEqual(reviewGroup, { title: 'review', count: '2', cards: ['demo', 'review-skill'] });
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
    ['user-agents', 'user-dsh'],
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

test('the Map view renders every visible skill as an accessible block', async () => {
  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
  await pick(container.querySelector('select.deck-groupby'), 'category');
  assert.ok(buttonByText('Map'), 'map view control');

  await click(buttonByText('Map'));
  assert.equal(buttonByText('Map')?.getAttribute('aria-pressed'), 'true');
  assert.equal(buttonByText('List')?.getAttribute('aria-pressed'), 'false');
  assert.equal(buttonByText('Cards')?.getAttribute('aria-pressed'), 'false');
  assert.equal(container.querySelectorAll('.deck-row').length, 0, 'list is replaced by the map');
  assert.equal(container.querySelectorAll('.deck-card').length, 0, 'cards are replaced by the map');
  assert.ok(container.querySelector('.deck-map'), 'map rendered');

  const blocks = mapBlocks();
  assert.deepEqual(
    blocks.map((block) => block.dataset.skill).sort(),
    ['demo', 'docs-skill', 'lint-skill', 'review-skill'],
  );
  for (const block of blocks) {
    assert.equal(block.tagName, 'BUTTON', 'every map block is a button');
    const name = block.dataset.skill;
    const label = block.getAttribute('aria-label') || '';
    assert.match(label, new RegExp(name), 'accessible name carries the skill name');
    assert.match(label, /\d+ B/, 'accessible name carries the size');
    const details = block.querySelector('.deck-map-details');
    assert.ok(details, 'details element rendered');
    assert.match(details.textContent, new RegExp(name));
    assert.match(details.textContent, /\d+ B/);
  }
  assert.match(mapBlockFor('demo').getAttribute('aria-label'), /64 B/);
  assert.match(mapBlockFor('docs-skill').getAttribute('aria-label'), /128 B/);
});

test('map block area is proportional to bundle bytes', async () => {
  const bytesByName = { demo: 64, 'docs-skill': 128, 'lint-skill': 32, 'review-skill': 96 };
  const totalBytes = Object.values(bytesByName).reduce((sum, bytes) => sum + bytes, 0);
  for (const [name, bytes] of Object.entries(bytesByName)) {
    const share = blockArea(mapBlockFor(name)) / 10000;
    assert.ok(
      Math.abs(share - bytes / totalBytes) < 0.001,
      name + ' covers ' + share.toFixed(4) + ' of the map, expected ' + (bytes / totalBytes).toFixed(4),
    );
  }
});

test('map blocks tile the canvas without overlaps or gaps', async () => {
  const boxes = mapBlocks().map((block) => ({
    name: block.dataset.skill,
    left: parseFloat(block.style.left),
    top: parseFloat(block.style.top),
    width: parseFloat(block.style.width),
    height: parseFloat(block.style.height),
  }));
  let covered = 0;
  for (const box of boxes) {
    assert.ok(box.left >= -1e-6 && box.top >= -1e-6, box.name + ' starts inside the canvas');
    assert.ok(box.left + box.width <= 100 + 1e-6, box.name + ' stays within the canvas width');
    assert.ok(box.top + box.height <= 100 + 1e-6, box.name + ' stays within the canvas height');
    covered += box.width * box.height;
  }
  assert.ok(Math.abs(covered - 10000) < 0.01, 'blocks cover the whole canvas');
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapWidth = Math.min(a.left + a.width, b.left + b.width) - Math.max(a.left, b.left);
      const overlapHeight = Math.min(a.top + a.height, b.top + b.height) - Math.max(a.top, b.top);
      const overlap = Math.max(0, overlapWidth) * Math.max(0, overlapHeight);
      assert.ok(overlap < 1e-6, a.name + ' and ' + b.name + ' do not overlap');
    }
  }
});

test('map blocks fall back from bytes to file count and then to equal area', async () => {
  profile = {
    ...JSON.parse(JSON.stringify(baseProfile)),
    skills: [
      { ...baseProfile.skills[0], name: 'bytes-skill', bytes: 50, files: 1 },
      { ...baseProfile.skills[0], name: 'files-skill', bytes: 0, files: 3 },
      { ...baseProfile.skills[0], name: 'empty-skill', bytes: 0, files: 0 },
    ],
    totals: { ...baseProfile.totals, skills: 3 },
  };
  await click(buttonByText('Refresh'));
  assert.equal(mapBlocks().length, 3, 'fallback deck rendered');

  const totalWeight = 50 + 3 + 1;
  const expected = { 'bytes-skill': 50, 'files-skill': 3, 'empty-skill': 1 };
  for (const [name, weight] of Object.entries(expected)) {
    const share = blockArea(mapBlockFor(name)) / 10000;
    assert.ok(
      Math.abs(share - weight / totalWeight) < 0.001,
      name + ' covers ' + share.toFixed(4) + ', expected ' + (weight / totalWeight).toFixed(4),
    );
  }
  assert.ok(blockArea(mapBlockFor('files-skill')) > blockArea(mapBlockFor('empty-skill')));

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('clicking a map block opens the editor and the map exposes no destructive actions', async () => {
  const blocks = mapBlocks();
  assert.equal(container.querySelectorAll('.deck-map button').length, blocks.length, 'only blocks are buttons');
  assert.equal(container.querySelector('.deck-map .deck-btn.danger'), null, 'no destructive control');
  assert.doesNotMatch(container.querySelector('.deck-map').textContent, /Remove|Duplicate|Tag|Open folder/);

  calls.length = 0;
  await click(mapBlockFor('demo'));
  const read = calls.find((call) => call.path === '/dsh-skill-deck/read');
  assert.deepEqual(read?.body, { name: 'demo' }, 'the map block reads its skill');
  assert.ok(container.querySelector('textarea'), 'editor opened from the map');
  await click(buttonByText('Cancel'));
  assert.equal(container.querySelector('textarea'), null, 'editor closed');
});

test('map colors follow the grouping dimension and a legend decodes them', async () => {
  assert.deepEqual(
    legendEntries().map((entry) => [entry.label, entry.count]),
    [
      ['documentation', '2'],
      ['review', '1'],
      ['Uncategorized', '1'],
    ],
  );
  const colorFor = (label) => legendEntries().find((entry) => entry.label === label)?.color;
  assert.ok(colorFor('documentation'), 'legend swatch has a color');
  assert.equal(new Set([colorFor('documentation'), colorFor('review'), colorFor('Uncategorized')]).size, 3);
  assert.equal(mapBlockFor('docs-skill').style.backgroundColor, colorFor('documentation'));
  assert.equal(mapBlockFor('lint-skill').style.backgroundColor, colorFor('documentation'));
  assert.equal(mapBlockFor('review-skill').style.backgroundColor, colorFor('review'));
  assert.equal(mapBlockFor('demo').style.backgroundColor, colorFor('Uncategorized'));

  await pick(container.querySelector('select.deck-groupby'), 'author');
  assert.deepEqual(
    legendEntries().map((entry) => [entry.label, entry.count]),
    [
      ['Docs Writer', '2'],
      ['Dex Horthy', '1'],
      ['Unknown', '1'],
    ],
  );
  assert.equal(
    mapBlockFor('demo').style.backgroundColor,
    legendEntries().find((entry) => entry.label === 'Unknown')?.color,
  );
  assert.equal(
    mapBlockFor('docs-skill').style.backgroundColor,
    legendEntries().find((entry) => entry.label === 'Docs Writer')?.color,
  );

  await pick(container.querySelector('select.deck-groupby'), 'root');
  assert.deepEqual(
    legendEntries().map((entry) => [entry.label, entry.count]),
    [
      ['user-agents', '2'],
      ['user-dsh', '2'],
    ],
  );
  await pick(container.querySelector('select.deck-groupby'), 'category');
});

test('search and the status filter narrow the map and its legend', async () => {
  const search = container.querySelector('input[type="search"]');
  await act(async () => {
    setValue(search, 'demo');
  });
  await settle();
  assert.deepEqual(mapBlocks().map((block) => block.dataset.skill), ['demo']);
  assert.deepEqual(
    legendEntries().map((entry) => [entry.label, entry.count]),
    [['Uncategorized', '1']],
  );

  await act(async () => {
    setValue(search, '');
  });
  await settle();
  assert.equal(mapBlocks().length, 4, 'clearing the search restores every block');

  await pick(container.querySelector('select.deck-filter'), 'invalid');
  assert.deepEqual(mapBlocks().map((block) => block.dataset.skill), ['review-skill']);
  assert.deepEqual(
    legendEntries().map((entry) => [entry.label, entry.count]),
    [['review', '1']],
  );
  await pick(container.querySelector('select.deck-filter'), 'all');
  assert.equal(mapBlocks().length, 4);
});

test('the Map view keeps the no-match and empty states', async () => {
  const search = container.querySelector('input[type="search"]');
  await act(async () => {
    setValue(search, 'nope');
  });
  await settle();
  assert.equal(mapBlocks().length, 0);
  assert.equal(legendEntries().length, 0);
  assert.match(container.textContent, /No matching skills/);
  await act(async () => {
    setValue(search, '');
  });
  await settle();

  profile = {
    ...JSON.parse(JSON.stringify(baseProfile)),
    skills: [],
    totals: { skills: 0, modelInvocable: 0, userInvocable: 0, invalid: 0 },
  };
  await click(buttonByText('Refresh'));
  assert.match(container.textContent, /No skills yet/);
  assert.equal(mapBlocks().length, 0);

  profile = JSON.parse(JSON.stringify(baseProfile));
  await click(buttonByText('Refresh'));
});

test('the Map view and grouping survive a remount', async () => {
  await pick(container.querySelector('select.deck-groupby'), 'author');

  const otherContainer = document.createElement('div');
  document.body.appendChild(otherContainer);
  const otherRoot = createRoot(otherContainer);
  await act(async () => {
    otherRoot.render(React.createElement(Panel));
  });
  await settle();
  await settle();
  assert.ok(otherContainer.querySelector('.deck-map'), 'map view restored');
  assert.equal(otherContainer.querySelectorAll('.deck-map-block').length, 4);
  assert.equal(otherContainer.querySelector('select.deck-groupby').value, 'author');
  assert.deepEqual(
    [...otherContainer.querySelectorAll('.deck-legend-label')].map((node) => node.textContent.trim()),
    ['Docs Writer', 'Dex Horthy', 'Unknown'],
  );
  await act(async () => {
    otherRoot.unmount();
  });
  otherContainer.remove();
  await pick(container.querySelector('select.deck-groupby'), 'category');
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

test('cleanup', async () => {
  await act(async () => {
    root.unmount();
  });
});
