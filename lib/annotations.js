/**
 * Plugin-owned skill annotations: a category and an author keyed by skill name.
 *
 * Annotations live in `$DSH_HOME/skill-deck/annotations.json`, never in
 * `SKILL.md`. The file is versioned, written atomically, and a missing,
 * unreadable or malformed copy degrades to an empty set so that skill
 * discovery keeps working.
 */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { dshHome, listSkills, UNCATEGORIZED, UNKNOWN_AUTHOR } from './store.js';

export const ANNOTATION_VERSION = 1;

/**
 * The one file this plugin owns for annotations.
 * @returns {string}
 */
export function annotationFilePath() {
  return join(dshHome(), 'skill-deck', 'annotations.json');
}

/**
 * @returns {{version: number, skills: Record<string, {category?: string, author?: string, updatedAt?: string}>}}
 */
export function emptyAnnotations() {
  return { version: ANNOTATION_VERSION, skills: {} };
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = {};
  if (typeof value.category === 'string' && value.category.trim() !== '') entry.category = value.category.trim();
  if (typeof value.author === 'string' && value.author.trim() !== '') entry.author = value.author.trim();
  if (typeof value.updatedAt === 'string') entry.updatedAt = value.updatedAt;
  return entry.category === undefined && entry.author === undefined ? null : entry;
}

/**
 * Read the annotation file. Any failure is an empty set, never an error.
 * @returns {{version: number, skills: Record<string, object>}}
 */
export function readAnnotations() {
  let raw;
  try {
    raw = readFileSync(annotationFilePath(), 'utf8');
  } catch {
    return emptyAnnotations();
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return emptyAnnotations();
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyAnnotations();
  if (parsed.version !== ANNOTATION_VERSION) return emptyAnnotations();
  if (!parsed.skills || typeof parsed.skills !== 'object' || Array.isArray(parsed.skills)) {
    return emptyAnnotations();
  }
  const skills = {};
  for (const [name, value] of Object.entries(parsed.skills)) {
    const entry = normalizeEntry(value);
    if (entry) skills[name] = entry;
  }
  return { version: ANNOTATION_VERSION, skills };
}

/**
 * Write the whole annotation set atomically: temporary file plus rename.
 * @param {{version: number, skills: Record<string, object>}} annotations
 */
export function writeAnnotations(annotations) {
  const file = annotationFilePath();
  mkdirSync(dirname(file), { recursive: true });
  const suffix = [process.pid, Date.now(), Math.random().toString(16).slice(2)].join('.');
  const temporary = join(dirname(file), '.' + basename(file) + '.' + suffix + '.tmp');
  writeFileSync(temporary, JSON.stringify(annotations, null, 2) + '\n', 'utf8');
  renameSync(temporary, file);
}

/**
 * Overlay manual annotations on discovered skills.
 * @param {Array<object>} skills
 * @param {{skills: Record<string, object>}} [annotations]
 * @returns {Array<object>}
 */
export function applyAnnotations(skills, annotations = readAnnotations()) {
  return skills.map((skill) => {
    const entry = annotations.skills[skill.name];
    if (!entry) return skill;
    return {
      ...skill,
      category: entry.category ?? skill.category ?? UNCATEGORIZED,
      author: entry.author ?? skill.author ?? UNKNOWN_AUTHOR,
    };
  });
}

/**
 * Validate that a skill exists, persist its category and author, and return the
 * updated summary. An empty or omitted field clears that manual value.
 * @param {{name: string, category?: string, author?: string}} input
 * @returns {Promise<{skill: object}>}
 */
export async function annotateSkill(input) {
  const name = String(input.name ?? '');
  const { skills } = await listSkills();
  const skill = skills.find((candidate) => candidate.name === name);
  if (!skill) throw Object.assign(new Error(`unknown skill "${name}"`), { status: 404 });

  const annotations = readAnnotations();
  const entry = { ...(annotations.skills[name] ?? {}) };
  if (input.category !== undefined) {
    const value = input.category.trim();
    if (value) entry.category = value;
    else delete entry.category;
  }
  if (input.author !== undefined) {
    const value = input.author.trim();
    if (value) entry.author = value;
    else delete entry.author;
  }
  if (entry.category === undefined && entry.author === undefined) delete annotations.skills[name];
  else {
    entry.updatedAt = new Date().toISOString();
    annotations.skills[name] = entry;
  }
  writeAnnotations(annotations);
  return { skill: applyAnnotations([skill], annotations)[0] };
}
