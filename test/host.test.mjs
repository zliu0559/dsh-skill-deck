import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

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
  for (const path of ['/state', '/create', '/signal', '/read', '/save', '/toggle', '/delete', '/reveal']) {
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
