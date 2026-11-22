import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { annotationFilePath } from '../lib/annotations.js';

const home = mkdtempSync(join(tmpdir(), 'skill-deck-host-'));
process.env.DSH_HOME = home;
process.env.DSH_AGENTS_HOME = join(home, 'agents');

const skillDir = join(home, 'skills', 'demo');
mkdirSync(skillDir, { recursive: true });
writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: demo\ndescription: Demo skill.\n---\n\n# Demo\n', 'utf8');

const routes = new Map();
const disposers = [];
const fakeWebServer = {
  register(registration) {
    routes.set(registration.path, registration.handler);
    return () => routes.delete(registration.path);
  },
};
const ctx = {
  get(name) {
    if (name === 'logger') return { info() {}, warn() {} };
    if (name === 'webServer') return fakeWebServer;
    return undefined;
  },
  inject(_deps, callback) {
    callback({ webServer: fakeWebServer });
  },
  effect(factory) {
    disposers.push(factory());
  },
};

const { apply, name } = await import('../index.js?host-test');
apply(ctx);

function makeRequest({ method = 'GET', url = '/', headers = {}, body = '' } = {}) {
  const request = new EventEmitter();
  request.method = method;
  request.url = url;
  request.headers = headers;
  process.nextTick(() => {
    if (body) request.emit('data', Buffer.from(body, 'utf8'));
    request.emit('end');
  });
  return request;
}

function call(path, options) {
  const handler = routes.get('/dsh-skill-deck' + path);
  assert.ok(handler, 'route is mounted: ' + path);
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 0,
      headers: {},
      setHeader(key, value) {
        this.headers[key.toLowerCase()] = value;
      },
      end(payload) {
        resolve({ status: this.statusCode, headers: this.headers, body: payload });
      },
    };
    try {
      handler(makeRequest(options), response);
    } catch (error) {
      reject(error);
    }
  });
}

test('exports a cordis plugin and mounts every route', () => {
  assert.equal(name, 'dsh-skill-deck');
  for (const path of ['/state', '/diag', '/create', '/duplicate', '/signal', '/read', '/save', '/toggle', '/delete', '/reveal', '/annotate']) {
    assert.ok(routes.has('/dsh-skill-deck' + path), path);
  }
});

test('state lists the skill with its surfaces', async () => {
  const result = await call('/state');
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.skills.length, 1);
  assert.equal(payload.skills[0].name, 'demo');
  assert.equal(payload.skills[0].modelInvocable, true);
});

test('read returns content and a revision', async () => {
  const result = await call('/read', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo' }),
  });
  const payload = JSON.parse(result.body);
  assert.equal(payload.ok, true);
  assert.match(payload.content, /# Demo/);
  assert.match(payload.revision, /^[0-9a-f]{16}$/);
});

test('diagnostics report the client registry when it is available', async () => {
  const result = await call('/diag');
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.ok, true);
  assert.equal(typeof payload.version, 'string');
  assert.equal(payload.client.available, false, 'no client registry in this fake context');
});

test('duplicate copies a skill and refuses a collision', async () => {
  const first = await call('/duplicate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', newName: 'demo-copy' }),
  });
  assert.equal(first.status, 200);
  assert.equal(JSON.parse(first.body).skill.name, 'demo-copy');
  const second = await call('/duplicate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', newName: 'demo-copy' }),
  });
  assert.equal(second.status, 409);
});

test('the browser half can report that it loaded and rendered', async () => {
  const before = JSON.parse((await call('/state')).body);
  assert.equal(before.client.loadedAt, null);
  const signal = await call('/signal', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1', 'user-agent': 'test-agent' },
    body: JSON.stringify({ kind: 'loaded' }),
  });
  assert.equal(signal.status, 200);
  const after = JSON.parse((await call('/state')).body);
  assert.match(after.client.loadedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(after.client.userAgent, 'test-agent');
  const bad = await call('/signal', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ kind: 'bogus' }),
  });
  assert.equal(bad.status, 400);
});

test('create makes a new skill and refuses a duplicate', async () => {
  const first = await call('/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'route-created', description: 'Created through the route.' }),
  });
  assert.equal(first.status, 200);
  assert.equal(JSON.parse(first.body).skill.name, 'route-created');
  const duplicate = await call('/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'route-created', description: 'Again.' }),
  });
  assert.equal(duplicate.status, 409);
});

test('toggle refuses an unknown surface', async () => {
  const result = await call('/toggle', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', surface: 'bogus', enabled: false }),
  });
  assert.equal(result.status, 400);
});

test('toggle disables the model surface and reports the new skill', async () => {
  const result = await call('/toggle', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', surface: 'model', enabled: false }),
  });
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.skill.modelInvocable, false);
  assert.ok(readFileSync(join(skillDir, 'SKILL.md'), 'utf8').includes('disable-model-invocation: true'));
});

test('save rejects a stale revision with 409', async () => {
  const read = await call('/read', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo' }),
  });
  const { content, revision } = JSON.parse(read.body);
  const first = await call('/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', content: content + '\nmore\n', revision }),
  });
  assert.equal(first.status, 200);
  const second = await call('/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', content: content + '\nother\n', revision }),
  });
  assert.equal(second.status, 409);
});

test('delete requires the skill name as confirmation', async () => {
  const result = await call('/delete', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', confirm: 'not-demo' }),
  });
  assert.equal(result.status, 400);
});

test('writes without a JSON content type are refused', async () => {
  const result = await call('/toggle', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', surface: 'model', enabled: false }),
  });
  assert.equal(result.status, 415);
});

test('a foreign origin is refused', async () => {
  const result = await call('/state', {
    headers: { origin: 'https://evil.example', host: '127.0.0.1:1' },
  });
  assert.equal(result.status, 403);
});

test('a cross-site fetch is refused', async () => {
  const result = await call('/state', {
    headers: { 'sec-fetch-site': 'cross-site', host: '127.0.0.1:1' },
  });
  assert.equal(result.status, 403);
});

test('a same-origin browser call is allowed', async () => {
  const result = await call('/state', {
    headers: { origin: 'http://127.0.0.1:1', host: '127.0.0.1:1' },
  });
  assert.equal(result.status, 200);
});

const annotationFile = annotationFilePath();
const annotationDir = join(home, 'skill-deck');

function annotationBackups() {
  return readdirSync(annotationDir).filter((name) => /^annotations\.corrupt-.*\.json$/.test(name));
}

function writeSkillWith(name, extraLines = []) {
  const dir = join(home, 'skills', name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'SKILL.md'),
    ['---', `name: ${name}`, 'description: ' + name + ' skill.', ...extraLines, '---', '', '# ' + name, ''].join('\n'),
    'utf8',
  );
  return join(dir, 'SKILL.md');
}

function stateSkill(payload, name) {
  return payload.skills.find((skill) => skill.name === name);
}

test('state falls back through metadata.author and metadata.credits.author', async () => {
  writeSkillWith('plain-annotated');
  writeSkillWith('authored', ['metadata:', '  author: Front Author']);
  writeSkillWith('credited', ['metadata:', '  credits:', '    author: Credit Author']);
  writeSkillWith('both-authored', ['metadata:', '  author: Front Author', '  credits:', '    author: Credit Author']);

  const result = await call('/state');
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);

  const plain = stateSkill(payload, 'plain-annotated');
  assert.equal(plain.category, 'Uncategorized');
  assert.equal(plain.author, 'Unknown');
  assert.equal(plain.manualCategory, '', 'no manual category is exposed as empty');
  assert.equal(plain.manualAuthor, '', 'no manual author is exposed as empty');
  assert.equal(stateSkill(payload, 'authored').author, 'Front Author');
  assert.equal(stateSkill(payload, 'authored').manualAuthor, '', 'frontmatter authors stay out of manual values');
  assert.equal(stateSkill(payload, 'credited').author, 'Credit Author');
  assert.equal(stateSkill(payload, 'both-authored').author, 'Front Author');
});

const jsonHeaders = { 'content-type': 'application/json', host: '127.0.0.1:1' };

test('annotate persists to a versioned plugin file and never rewrites SKILL.md', async () => {
  const skillFile = join(skillDir, 'SKILL.md');
  const before = readFileSync(skillFile);
  const result = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'demo', category: '  Review  ', author: 'Dex Horthy' }),
  });
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);
  assert.equal(payload.ok, true);
  assert.equal(payload.skill.name, 'demo');
  assert.equal(payload.skill.category, 'Review');
  assert.equal(payload.skill.author, 'Dex Horthy');
  assert.equal(payload.skill.manualCategory, 'Review', 'the route returns the manual category');
  assert.equal(payload.skill.manualAuthor, 'Dex Horthy', 'the route returns the manual author');
  assert.deepEqual(readFileSync(skillFile), before, 'SKILL.md bytes are untouched');

  const stored = JSON.parse(readFileSync(annotationFile, 'utf8'));
  assert.equal(stored.version, 1);
  assert.equal(stored.skills.demo.category, 'Review');
  assert.equal(stored.skills.demo.author, 'Dex Horthy');
  assert.match(stored.skills.demo.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  const state = JSON.parse((await call('/state')).body);
  assert.equal(stateSkill(state, 'demo').category, 'Review');
  assert.equal(stateSkill(state, 'demo').author, 'Dex Horthy');
  assert.equal(stateSkill(state, 'demo').manualCategory, 'Review');
  assert.equal(stateSkill(state, 'demo').manualAuthor, 'Dex Horthy');
});

test('clearing a field restores the frontmatter fallback', async () => {
  writeSkillWith('fallback-skill', ['metadata:', '  author: Front Author']);
  const annotated = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'fallback-skill', category: 'docs', author: 'Manual Author' }),
  });
  assert.equal(annotated.status, 200);
  assert.equal(JSON.parse(annotated.body).skill.author, 'Manual Author');

  const cleared = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'fallback-skill', category: '', author: '' }),
  });
  assert.equal(cleared.status, 200);
  const skill = JSON.parse(cleared.body).skill;
  assert.equal(skill.category, 'Uncategorized');
  assert.equal(skill.author, 'Front Author', 'manual value is gone, metadata.author returns');
  assert.equal(skill.manualCategory, '');
  assert.equal(skill.manualAuthor, '');

  const stored = JSON.parse(readFileSync(annotationFile, 'utf8'));
  assert.equal(stored.skills['fallback-skill'], undefined);
});

test('mutating routes return the annotated summary so tags survive a toggle', async () => {
  const result = await call('/toggle', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'demo', surface: 'model', enabled: false }),
  });
  assert.equal(result.status, 200);
  const skill = JSON.parse(result.body).skill;
  assert.equal(skill.modelInvocable, false);
  assert.equal(skill.manualCategory, 'Review', 'the toggle response keeps the manual category');
  assert.equal(skill.manualAuthor, 'Dex Horthy', 'the toggle response keeps the manual author');
  assert.equal(skill.category, 'Review', 'the effective category stays annotated');
  assert.equal(skill.author, 'Dex Horthy', 'the effective author stays annotated');
});

test('deleting a skill removes its annotation entry', async () => {
  writeSkillWith('doomed-skill', ['metadata:', '  author: Front Author']);
  const annotated = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'doomed-skill', category: 'temporary', author: 'Manual Person' }),
  });
  assert.equal(annotated.status, 200);
  const before = JSON.parse(readFileSync(annotationFile, 'utf8'));
  assert.equal(before.skills['doomed-skill'].category, 'temporary');
  assert.equal(before.skills.demo.category, 'Review', 'other annotations are present before the delete');

  const removed = await call('/delete', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'doomed-skill', confirm: 'doomed-skill' }),
  });
  assert.equal(removed.status, 200);

  const stored = JSON.parse(readFileSync(annotationFile, 'utf8'));
  assert.equal(stored.skills['doomed-skill'], undefined, 'the deleted skill no longer has an annotation');
  assert.equal(stored.skills.demo.category, 'Review', 'other annotations survive');

  const state = JSON.parse((await call('/state')).body);
  assert.equal(stateSkill(state, 'doomed-skill'), undefined, 'the deleted skill is gone from the deck');
});

test('annotate rejects unknown skills and non-JSON bodies', async () => {
  const unknown = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'no-such-skill', category: 'x', author: 'y' }),
  });
  assert.equal(unknown.status, 404);

  const invalid = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: '{ this is not json',
  });
  assert.equal(invalid.status, 400);

  const wrongType = await call('/annotate', {
    method: 'POST',
    headers: { 'content-type': 'text/plain', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', category: 'x' }),
  });
  assert.equal(wrongType.status, 415);
});

test('a malformed annotation file degrades to an empty set and a write recovers it', async () => {
  mkdirSync(annotationDir, { recursive: true });
  const malformed = '{ this is not json';
  writeFileSync(annotationFile, malformed, 'utf8');
  const result = await call('/state');
  assert.equal(result.status, 200);
  const payload = JSON.parse(result.body);
  const demo = stateSkill(payload, 'demo');
  assert.ok(demo, 'skills still list despite the corrupt file');
  assert.equal(demo.category, 'Uncategorized');
  assert.equal(demo.author, 'Unknown');

  const saved = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'demo', category: 'recovered', author: 'Someone' }),
  });
  assert.equal(saved.status, 200);
  const stored = JSON.parse(readFileSync(annotationFile, 'utf8'));
  assert.equal(stored.version, 1);
  assert.equal(stored.skills.demo.category, 'recovered');

  const backups = annotationBackups();
  assert.equal(backups.length, 1, 'the corrupt file is preserved before it is overwritten');
  assert.equal(readFileSync(join(annotationDir, backups[0]), 'utf8'), malformed);
});

test('an unknown annotation version is preserved before a write replaces it', async () => {
  const future = JSON.stringify({ version: 99, skills: { demo: { category: 'future' } } });
  writeFileSync(annotationFile, future, 'utf8');
  const state = JSON.parse((await call('/state')).body);
  assert.equal(stateSkill(state, 'demo').category, 'Uncategorized', 'an unknown version is ignored');

  const saved = await call('/annotate', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name: 'demo', category: 'current', author: 'Someone' }),
  });
  assert.equal(saved.status, 200);
  const stored = JSON.parse(readFileSync(annotationFile, 'utf8'));
  assert.equal(stored.version, 1);
  assert.equal(stored.skills.demo.category, 'current');

  const backups = annotationBackups();
  assert.equal(backups.length, 2, 'the unknown-version file joins the earlier backup');
  const preserved = backups.map((name) => readFileSync(join(annotationDir, name), 'utf8'));
  assert.ok(preserved.includes(future), 'the unknown-version bytes are preserved');
});
