/**
 * dsh-skill-deck — Host half.
 *
 * Mounts a small same-origin JSON API for the Settings panel: list the skills
 * under the DSH user roots, read one document, toggle its two invocation
 * surfaces, save an edited document, move a skill to the trash, and open its
 * directory in the OS file manager.
 */
import { annotateSkill, applyAnnotations, removeAnnotation } from './lib/annotations.js';
import {
  createSkill,
  duplicateSkill,
  listSkills,
  readSkill,
  removeSkill,
  revealSkill,
  saveSkill,
  toggleSkill,
} from './lib/store.js';
import { readFileSync } from 'node:fs';

const ROUTE_BASE = '/dsh-skill-deck';
const BODY_LIMIT_BYTES = 2 * 1024 * 1024;

export const name = 'dsh-skill-deck';

let cachedVersion;

/** Signals sent by the browser half; they prove the client bundle really ran. */
const clientSignals = { loadedAt: null, renderedAt: null, userAgent: null };

function recordSignal(kind, request) {
  const at = new Date().toISOString();
  if (kind === 'loaded') clientSignals.loadedAt = at;
  if (kind === 'rendered') clientSignals.renderedAt = at;
  if (clientSignals.userAgent === null) clientSignals.userAgent = request.headers['user-agent'] ?? null;
}

function pluginVersion() {
  if (cachedVersion !== undefined) return cachedVersion;
  try {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
    cachedVersion = typeof manifest.version === 'string' ? manifest.version : 'unknown';
  } catch {
    cachedVersion = 'unknown';
  }
  return cachedVersion;
}

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.statusCode = status;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.setHeader('cache-control', 'no-store');
  response.end(body);
}

function fail(response, error) {
  const status = typeof error?.status === 'number' ? error.status : 500;
  const message = error instanceof Error ? error.message : String(error);
  if (status >= 500) console.error('[dsh-skill-deck]', error);
  sendJson(response, status, { ok: false, error: message });
}

/**
 * Store summaries know nothing about annotations. Every route that returns one
 * overlays the plugin-owned values, so the client can replace a skill from any
 * response without dropping its manual category or author.
 * @param {{skill?: object}} result
 */
function withAnnotations(result) {
  if (!result || !result.skill) return result;
  return { ...result, skill: applyAnnotations([result.skill])[0] };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT_BYTES) {
        reject(Object.assign(new Error('request body is too large'), { status: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

async function readJson(request) {
  const raw = await readBody(request);
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('body must be a JSON object');
    }
    return parsed;
  } catch {
    throw Object.assign(new Error('request body is not valid JSON'), { status: 400 });
  }
}

/**
 * These routes are reachable without the app's login cookie, so they defend
 * themselves: same-origin only, JSON content type for writes, and a cross-site
 * fetch is refused outright.
 * @param {import('node:http').IncomingMessage} request
 */
function assertLocalCaller(request) {
  const site = request.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') {
    throw Object.assign(new Error('cross-site requests are not allowed'), { status: 403 });
  }
  const origin = request.headers.origin;
  if (origin) {
    let originHost = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = null;
    }
    if (!originHost || originHost !== request.headers.host) {
      throw Object.assign(new Error('origin does not match this host'), { status: 403 });
    }
  }
  if (request.method === 'POST') {
    const contentType = request.headers['content-type'] || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw Object.assign(new Error('writes must be application/json'), { status: 415 });
    }
  }
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx
 */
export function apply(ctx) {
  const logger = ctx.get('logger');
  const report = (message) => {
    if (logger && typeof logger.info === 'function') logger.info('[dsh-skill-deck] ' + message);
  };

  ctx.inject(['webServer'], (host) => {
    const webServer = host?.webServer ?? ctx.get('webServer');
    if (!webServer || typeof webServer.register !== 'function') {
      report('webServer unavailable; routes not mounted');
      return;
    }
    const disposers = [];
    const route = (path, handler) => {
      disposers.push(
        webServer.register({
          kind: 'exact',
          path: ROUTE_BASE + path,
          handler: (request, response) => {
            try {
              assertLocalCaller(request);
            } catch (error) {
              fail(response, error);
              return;
            }
            Promise.resolve(handler(request, response)).catch((error) => fail(response, error));
          },
        }),
      );
    };

    route('/state', async (request, response) => {
      const { roots, skills } = await listSkills();
      const annotated = applyAnnotations(skills);
      const totals = {
        skills: annotated.length,
        modelInvocable: annotated.filter((skill) => skill.modelInvocable).length,
        userInvocable: annotated.filter((skill) => skill.userInvocable).length,
        invalid: annotated.filter((skill) => !skill.valid).length,
      };
      sendJson(response, 200, {
        ok: true,
        roots,
        skills: annotated,
        totals,
        version: pluginVersion(),
        platform: process.platform,
        node: process.versions.node,
        client: clientSignals,
      });
    });

    route('/diag', async (request, response) => {
      let client = { available: false };
      try {
        const modules = ctx.get('clientModules');
        if (modules && typeof modules.graph === 'function') {
          const graph = modules.graph() ?? {};
          const ids = Array.isArray(graph.entries)
            ? graph.entries
            : Array.isArray(graph.application)
              ? graph.application
              : [];
          const mine = ids.find((entry) => entry && entry.id === 'dsh-skill-deck') ?? null;
          client = {
            available: true,
            graphKeys: Object.keys(graph),
            entry: mine ? { id: mine.id, rev: mine.rev, url: mine.url ?? null } : null,
            entries: ids.length,
            clientPath: typeof modules.clientPath === 'function' ? (modules.clientPath('dsh-skill-deck') ?? null) : null,
          };
        }
      } catch (error) {
        client = { available: false, error: String(error && error.message ? error.message : error) };
      }
      sendJson(response, 200, {
        ok: true,
        version: pluginVersion(),
        signals: clientSignals,
        client,
      });
    });

    route('/signal', async (request, response) => {
      const payload = await readJson(request);
      if (payload.kind !== 'loaded' && payload.kind !== 'rendered') {
        throw Object.assign(new Error('kind must be "loaded" or "rendered"'), { status: 400 });
      }
      recordSignal(payload.kind, request);
      sendJson(response, 200, { ok: true, client: clientSignals });
    });

    route('/create', async (request, response) => {
      const payload = await readJson(request);
      const result = await createSkill({
        name: String(payload.name ?? ''),
        description: String(payload.description ?? ''),
        scope: typeof payload.scope === 'string' ? payload.scope : undefined,
      });
      sendJson(response, 200, { ok: true, ...withAnnotations(result) });
    });

    route('/annotate', async (request, response) => {
      const payload = await readJson(request);
      if (payload.category !== undefined && typeof payload.category !== 'string') {
        throw Object.assign(new Error('category must be a string'), { status: 400 });
      }
      if (payload.author !== undefined && typeof payload.author !== 'string') {
        throw Object.assign(new Error('author must be a string'), { status: 400 });
      }
      const result = await annotateSkill({
        name: String(payload.name ?? ''),
        category: payload.category,
        author: payload.author,
      });
      sendJson(response, 200, { ok: true, ...result });
    });

    route('/duplicate', async (request, response) => {
      const payload = await readJson(request);
      const result = await duplicateSkill({
        name: String(payload.name ?? ''),
        newName: String(payload.newName ?? ''),
      });
      sendJson(response, 200, { ok: true, ...withAnnotations(result) });
    });

    route('/read', async (request, response) => {
      const payload = await readJson(request);
      const result = await readSkill(String(payload.name ?? ''));
      sendJson(response, 200, { ok: true, ...withAnnotations(result) });
    });

    route('/save', async (request, response) => {
      const payload = await readJson(request);
      if (typeof payload.content !== 'string') {
        throw Object.assign(new Error('content must be a string'), { status: 400 });
      }
      const result = await saveSkill({
        name: String(payload.name ?? ''),
        content: payload.content,
        revision: typeof payload.revision === 'string' ? payload.revision : undefined,
      });
      sendJson(response, 200, { ok: true, ...withAnnotations(result) });
    });

    route('/toggle', async (request, response) => {
      const payload = await readJson(request);
      if (payload.surface !== 'model' && payload.surface !== 'user') {
        throw Object.assign(new Error('surface must be "model" or "user"'), { status: 400 });
      }
      if (typeof payload.enabled !== 'boolean') {
        throw Object.assign(new Error('enabled must be a boolean'), { status: 400 });
      }
      const result = await toggleSkill({
        name: String(payload.name ?? ''),
        surface: payload.surface,
        enabled: payload.enabled,
      });
      sendJson(response, 200, { ok: true, ...withAnnotations(result) });
    });

    route('/delete', async (request, response) => {
      const payload = await readJson(request);
      const result = await removeSkill({
        name: String(payload.name ?? ''),
        confirm: String(payload.confirm ?? ''),
      });
      // The skill is already in the trash; a failed annotation cleanup must not
      // turn a successful removal into an error response.
      try {
        removeAnnotation(result.skill.name);
      } catch (error) {
        console.error('[dsh-skill-deck] could not remove the annotation entry', error);
      }
      sendJson(response, 200, { ok: true, ...result });
    });

    route('/reveal', async (request, response) => {
      const payload = await readJson(request);
      const result = await revealSkill(String(payload.name ?? ''));
      sendJson(response, 200, { ok: true, ...result });
    });

    report('routes mounted');
    ctx.effect(() => () => {
      for (const dispose of disposers) {
        try {
          dispose();
        } catch {
          /* a route that is already gone is not an error */
        }
      }
    }, 'dsh-skill-deck: routes');
  });
}
