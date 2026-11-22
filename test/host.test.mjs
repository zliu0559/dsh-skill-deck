import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
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
  for (const path of ['/state', '/read', '/save', '/toggle', '/delete', '/reveal']) {
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

test('toggle refuses an unknown surface', async () => {
  const result = await call('/toggle', {
    method: 'POST',
    headers: { 'content-type': 'application/json', host: '127.0.0.1:1' },
    body: JSON.stringify({ name: 'demo', surface: 'bogus', enabled: false }),
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
