/**
 * Filesystem side of Skill Deck: skill discovery across the DSH user roots and
 * the mutations the Settings panel exposes (toggle surfaces, save, remove).
 *
 * Every mutating call re-discovers the skill by name instead of trusting a path
 * from the client, so a request can never address a file outside a skill root.
 */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import {
  booleanField,
  nestedStringField,
  parseFrontmatter,
  setBoolean,
  splitFrontmatter,
  stringField,
  validateSkillDocument,
} from './frontmatter.js';
import { writeFileAtomic } from './atomic.js';

const MAX_SKILL_BYTES = 2 * 1024 * 1024;
const SKIP_ENTRIES = new Set(['.git', 'node_modules', '__pycache__']);

/** Display fallbacks for a skill without a manual category or any author. */
export const UNCATEGORIZED = 'Uncategorized';
export const UNKNOWN_AUTHOR = 'Unknown';

/**
 * Resolve the DSH home directory the same way the Harness does.
 * @returns {string}
 */
export function dshHome() {
  const fromEnv = process.env.DSH_HOME;
  return fromEnv && fromEnv.trim() !== '' ? resolve(fromEnv) : join(homedir(), '.dsh');
}

/**
 * Resolve the shared agents home directory.
 * @returns {string}
 */
export function agentsHome() {
  const fromEnv = process.env.DSH_AGENTS_HOME;
  return fromEnv && fromEnv.trim() !== '' ? resolve(fromEnv) : join(homedir(), '.agents');
}

/**
 * The user-level roots this plugin manages, in the provider's own rank order.
 * Project roots are deliberately out of scope: they belong to a workspace.
 * @returns {Array<{id: string, path: string, label: string, writable: boolean}>}
 */
export function skillRoots() {
  return [
    {
      id: 'user-dsh',
      path: join(dshHome(), 'skills'),
      label: '~/.dsh/skills',
      writable: true,
    },
    {
      id: 'user-agents',
      path: join(agentsHome(), 'skills'),
      label: '~/.agents/skills',
      writable: true,
    },
  ];
}

function revisionOf(content) {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Read a skill file as strict UTF-8. A file written in another encoding is
 * reported instead of silently replacing bytes, because every write path would
 * otherwise mangle it.
 * @param {string} filePath
 * @returns {{content: string}}
 */
function readSkillText(filePath) {
  const buffer = readFileSync(filePath);
  try {
    const content = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return { content };
  } catch {
    throw Object.assign(new Error('skill file is not valid UTF-8'), { code: 'SKILL_NOT_UTF8' });
  }
}

function countFiles(dir) {
  let files = 0;
  let bytes = 0;
  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_ENTRIES.has(entry.name)) continue;
      const path = join(current, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (entry.isFile()) {
        files += 1;
        try {
          bytes += statSync(path).size;
        } catch {
          /* a racing delete simply is not counted */
        }
      }
    }
  };
  walk(dir);
  return { files, bytes };
}

function readSkillSummary(name, filePath, root, isBundle) {
  const summary = {
    name,
    path: filePath,
    dir: isBundle ? dirname(filePath) : null,
    isBundle,
    root: root.id,
    rootPath: root.path,
    description: '',
    modelInvocable: true,
    userInvocable: true,
    files: isBundle ? 0 : 1,
    bytes: 0,
    updatedAt: null,
    category: UNCATEGORIZED,
    author: UNKNOWN_AUTHOR,
    valid: true,
    error: null,
  };
  try {
    const stat = statSync(filePath);
    summary.updatedAt = stat.mtime.toISOString();
    summary.bytes = stat.size;
  } catch {
    summary.valid = false;
    summary.error = 'file is missing';
    return summary;
  }
  if (isBundle) {
    const size = countFiles(dirname(filePath));
    summary.files = size.files;
    summary.bytes = size.bytes;
  }
  let content = '';
  try {
    content = readSkillText(filePath).content;
  } catch (error) {
    summary.valid = false;
    summary.error = error.code === 'SKILL_NOT_UTF8' ? 'not valid UTF-8' : 'cannot read file';
    return summary;
  }
  const parsed = parseFrontmatter(content);
  if (!parsed) {
    summary.valid = false;
    summary.error = 'missing YAML frontmatter';
    return summary;
  }
  const description = stringField(parsed.data, 'description');
  const model = booleanField(parsed.data, 'disable-model-invocation');
  const user = booleanField(parsed.data, 'user-invocable');
  const author =
    nestedStringField(parsed, ['metadata', 'author']) ??
    nestedStringField(parsed, ['metadata', 'credits', 'author']);
  if (author) summary.author = author;
  summary.description = description ? description.trim() : '';
  summary.modelInvocable = model !== true;
  summary.userInvocable = user !== false;
  if (!description || !description.trim()) {
    summary.valid = false;
    summary.error = 'missing description';
  }
  return summary;
}

/**
 * Discover every skill under the managed roots.
 * @returns {Promise<{roots: ReturnType<typeof skillRoots>, skills: Array<object>}>}
 */
export async function listSkills() {
  const roots = skillRoots();
  const skills = [];
  const seen = new Set();
  for (const root of roots) {
    let entries;
    try {
      entries = readdirSync(root.path, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const full = join(root.path, entry.name);
      const kind = entryKind(entry, full);
      if (kind === 'directory') {
        const file = join(full, 'SKILL.md');
        if (!existsSync(file)) continue;
        if (seen.has(entry.name)) continue;
        seen.add(entry.name);
        skills.push(readSkillSummary(entry.name, file, root, true));
      } else if (kind === 'file' && entry.name.toLowerCase().endsWith('.md')) {
        const name = entry.name.slice(0, -3);
        if (seen.has(name)) continue;
        seen.add(name);
        skills.push(readSkillSummary(name, full, root, false));
      }
    }
  }
  skills.sort((a, b) => a.name.localeCompare(b.name));
  return { roots, skills };
}

/**
 * Classify a root entry, following a symlink or junction one level.
 * @param {import('node:fs').Dirent} entry
 * @param {string} full
 * @returns {'directory' | 'file' | null}
 */
function entryKind(entry, full) {
  if (entry.isDirectory()) return 'directory';
  if (entry.isFile()) return 'file';
  if (!entry.isSymbolicLink()) return null;
  try {
    const stat = statSync(full);
    if (stat.isDirectory()) return 'directory';
    if (stat.isFile()) return 'file';
  } catch {
    return null;
  }
  return null;
}

function findSkill(skills, name) {
  const found = skills.find((skill) => skill.name === name);
  if (!found) throw Object.assign(new Error(`unknown skill "${name}"`), { status: 404 });
  const expected = found.isBundle
    ? join(found.rootPath, found.name, 'SKILL.md')
    : join(found.rootPath, found.name + '.md');
  if (resolve(found.path) !== resolve(expected)) {
    throw Object.assign(new Error('skill path escaped its root'), { status: 400 });
  }
  return found;
}

/**
 * Read a skill's full document.
 * @param {string} name
 * @returns {Promise<{skill: object, content: string, revision: string}>}
 */
export async function readSkill(name) {
  const { skills } = await listSkills();
  const skill = findSkill(skills, name);
  const content = readTextOrThrow(skill.path);
  if (Buffer.byteLength(content, 'utf8') > MAX_SKILL_BYTES) {
    throw Object.assign(new Error('skill file is larger than 2 MiB'), { status: 413 });
  }
  return { skill, content, revision: revisionOf(content) };
}

function readTextOrThrow(filePath) {
  try {
    return readSkillText(filePath).content;
  } catch (error) {
    throw Object.assign(new Error('skill file is not valid UTF-8'), { status: 415 });
  }
}

/**
 * Save an edited skill document.
 * @param {{name: string, content: string, revision?: string}} input
 * @returns {Promise<{revision: string, skill: object}>}
 */
export async function saveSkill(input) {
  const { skills } = await listSkills();
  const skill = findSkill(skills, input.name);
  const current = readTextOrThrow(skill.path);
  if (input.revision && revisionOf(current) !== input.revision) {
    throw Object.assign(new Error('the file changed on disk; reload before saving'), { status: 409 });
  }
  const validated = validateSkillDocument(input.content, {
    expectedName: skill.name,
    allowFlat: !skill.isBundle,
  });
  if (!validated.ok) {
    throw Object.assign(new Error(validated.error), { status: 400 });
  }
  if (Buffer.byteLength(input.content, 'utf8') > MAX_SKILL_BYTES) {
    throw Object.assign(new Error('skill file is larger than 2 MiB'), { status: 413 });
  }
  writeFileAtomic(skill.path, input.content);
  const { skills: next } = await listSkills();
  return { revision: revisionOf(input.content), skill: next.find((item) => item.name === skill.name) };
}

/**
 * Enable or disable one invocation surface.
 * @param {{name: string, surface: 'model'|'user', enabled: boolean}} input
 * @returns {Promise<{skill: object, revision: string, changed: boolean}>}
 */
export async function toggleSkill(input) {
  const surface = input.surface === 'model' ? 'disable-model-invocation' : 'user-invocable';
  const { skills } = await listSkills();
  const skill = findSkill(skills, input.name);
  const current = readTextOrThrow(skill.path);
  const target = input.surface === 'model' ? !input.enabled : input.enabled;
  const result = setBoolean(current, surface, target);
  if (result.changed) writeFileAtomic(skill.path, result.text);
  const { skills: next } = await listSkills();
  return {
    skill: next.find((item) => item.name === skill.name),
    revision: revisionOf(result.text),
    changed: result.changed,
  };
}

/**
 * Create a new skill bundle with a minimal, valid document.
 * @param {{name: string, description: string, scope?: string}} input
 * @returns {Promise<{skill: object, revision: string}>}
 */
export async function createSkill(input) {
  const name = String(input.name ?? '').trim();
  const scope = input.scope === 'user-agents' ? 'user-agents' : 'user-dsh';
  const description = String(input.description ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
    throw Object.assign(new Error('name must be kebab-case, e.g. my-new-skill'), { status: 400 });
  }
  if (description === '') {
    throw Object.assign(new Error('description is required'), { status: 400 });
  }
  const root = skillRoots().find((candidate) => candidate.id === scope);
  if (!root) throw Object.assign(new Error('unknown scope'), { status: 400 });
  mkdirSync(root.path, { recursive: true });
  const dir = join(root.path, name);
  if (existsSync(dir) || existsSync(join(root.path, name + '.md'))) {
    throw Object.assign(new Error('a skill with that name already exists'), { status: 409 });
  }
  const content = ['---', `name: ${name}`, `description: ${yamlScalar(description)}`, '---', '', '# ' + name, ''].join('\n');
  mkdirSync(dir);
  writeFileSync(join(dir, 'SKILL.md'), content, 'utf8');
  const { skills } = await listSkills();
  return {
    skill: skills.find((item) => item.name === name),
    revision: revisionOf(content),
  };
}

/**
 * Copy a skill into a new name inside the same root, renaming its `name:` field.
 * @param {{name: string, newName: string}} input
 * @returns {Promise<{skill: object, revision: string}>}
 */
export async function duplicateSkill(input) {
  const { skills } = await listSkills();
  const source = findSkill(skills, String(input.name ?? ''));
  const target = String(input.newName ?? '').trim();
  const valid = source.isBundle ? /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(target) : /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(target);
  if (!valid) {
    throw Object.assign(new Error('the copy needs a valid, kebab-case name'), { status: 400 });
  }
  if (target === source.name) {
    throw Object.assign(new Error('the copy needs a different name'), { status: 400 });
  }
  const root = skillRoots().find((candidate) => candidate.id === source.root);
  if (!root) throw Object.assign(new Error('unknown root'), { status: 400 });
  const targetPath = source.isBundle ? join(root.path, target) : join(root.path, target + '.md');
  if (existsSync(targetPath) || skills.some((skill) => skill.name === target)) {
    throw Object.assign(new Error('a skill with that name already exists'), { status: 409 });
  }
  const renamed = renameInDocument(readTextOrThrow(source.path), target);
  if (source.isBundle) {
    cpSync(source.dir, targetPath, { recursive: true, force: false, errorOnExist: true });
    writeFileAtomic(join(targetPath, 'SKILL.md'), renamed);
  } else {
    writeFileSync(targetPath, renamed, 'utf8');
  }
  const { skills: next } = await listSkills();
  return {
    skill: next.find((skill) => skill.name === target),
    revision: revisionOf(renamed),
  };
}

/**
 * Replace the `name:` value of a document without touching anything else.
 * @param {string} text
 * @param {string} name
 * @returns {string}
 */
function renameInDocument(text, name) {
  const parts = splitFrontmatter(text);
  if (!parts) throw Object.assign(new Error('skill file has no YAML frontmatter'), { status: 400 });
  const lines = parts.frontmatter.split(/\r?\n/);
  const index = lines.findIndex((line) => /^name\s*:/.test(line));
  if (index === -1) throw Object.assign(new Error('skill file has no name field'), { status: 400 });
  lines[index] = 'name: ' + name;
  return ['---', ...lines, '---'].join(parts.eol) + parts.eol + parts.body;
}

/**
 * Quote a single-line YAML scalar only when it needs quoting.
 * @param {string} value
 * @returns {string}
 */
function yamlScalar(value) {
  if (/[:#{}[\],&*?|>'"%@`]/.test(value) || /^\s|\s$/.test(value) || value === '') {
    return JSON.stringify(value);
  }
  return value;
}

/**
 * Move a skill to the trash directory instead of deleting it outright.
 * @param {{name: string, confirm?: string}} input
 * @returns {Promise<{trashedTo: string, skill: object}>}
 */
export async function removeSkill(input) {
  const { skills } = await listSkills();
  const skill = findSkill(skills, input.name);
  if (input.confirm !== input.name) {
    throw Object.assign(new Error('confirmation does not match the skill name'), { status: 400 });
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const trash = join(dshHome(), 'skills-trash');
  mkdirSync(trash, { recursive: true });
  const target = join(trash, `${stamp}-${skill.name}${skill.isBundle ? '' : '.md'}`);
  renameSync(skill.isBundle ? skill.dir : skill.path, target);
  return { trashedTo: target, skill };
}

/**
 * Open a skill directory in the OS file manager.
 * @param {string} name
 * @returns {Promise<{opened: string}>}
 */
export async function revealSkill(name) {
  const { skills } = await listSkills();
  const skill = findSkill(skills, name);
  const target = skill.dir ?? dirname(skill.path);
  if (!existsSync(target)) throw Object.assign(new Error('directory no longer exists'), { status: 404 });
  await openDirectory(target);
  return { opened: target };
}

/**
 * @param {string} dir absolute directory
 * @returns {Promise<void>}
 */
export function openDirectory(dir) {
  if (!existsSync(dir) || resolve(dir) !== dir || !dir.includes(sep)) {
    return Promise.reject(new Error('refusing to open an unexpected path'));
  }
  const command =
    process.platform === 'win32' ? 'explorer.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const child = spawn(command, [dir], { detached: true, stdio: 'ignore' });
  child.unref();
  return Promise.resolve();
}

export { revisionOf };
