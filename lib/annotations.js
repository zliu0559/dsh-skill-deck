/**
 * Plugin-owned skill annotations: a category, an author and a series keyed by
 * skill name. Series are manual only; there is no frontmatter fallback.
 *
 * Annotations live in `$DSH_HOME/skill-deck/annotations.json`, never in
 * `SKILL.md`. The file is versioned, written atomically, and a missing,
 * unreadable or malformed copy degrades to an empty set so that skill
 * discovery keeps working. A corrupt copy is preserved next to the real file
 * before the first write replaces it, so the user can still recover it.
 */
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { writeFileAtomic } from './atomic.js';
import { dshHome, listSkills, UNCATEGORIZED, UNKNOWN_AUTHOR } from './store.js';

const ANNOTATION_VERSION = 1;

/**
 * The one file this plugin owns for annotations.
 * @returns {string}
 */
export function annotationFilePath() {
  return join(dshHome(), 'skill-deck', 'annotations.json');
}

/**
 * @returns {{version: number, skills: Record<string, {category?: string, author?: string, series?: string, updatedAt?: string}>}}
 */
function emptyAnnotations() {
  return { version: ANNOTATION_VERSION, skills: {} };
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const entry = {};
  if (typeof value.category === 'string' && value.category.trim() !== '') entry.category = value.category.trim();
  if (typeof value.author === 'string' && value.author.trim() !== '') entry.author = value.author.trim();
  if (typeof value.series === 'string' && value.series.trim() !== '') entry.series = value.series.trim();
  if (typeof value.updatedAt === 'string') entry.updatedAt = value.updatedAt;
  return entry.category === undefined && entry.author === undefined && entry.series === undefined
    ? null
    : entry;
}

function isEmptyEntry(entry) {
  return entry.category === undefined && entry.author === undefined && entry.series === undefined;
}

/**
 * Parse a raw annotation document. Returns null for anything this version does
 * not understand, including a future `version` number.
 * @param {string} raw
 * @returns {{version: number, skills: Record<string, object>} | null}
 */
function parseAnnotations(raw) {
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  if (parsed.version !== ANNOTATION_VERSION) return null;
  if (!parsed.skills || typeof parsed.skills !== 'object' || Array.isArray(parsed.skills)) return null;
  const skills = {};
  for (const [name, value] of Object.entries(parsed.skills)) {
    const entry = normalizeEntry(value);
    if (entry) skills[name] = entry;
  }
  return { version: ANNOTATION_VERSION, skills };
}

/**
 * Read the annotation file. Any failure is an empty set, never an error.
 * @returns {{version: number, skills: Record<string, object>}}
 */
function readAnnotations() {
  let raw;
  try {
    raw = readFileSync(annotationFilePath(), 'utf8');
  } catch {
    return emptyAnnotations();
  }
  return parseAnnotations(raw) ?? emptyAnnotations();
}

/**
 * Keep a copy of a file this version cannot parse, so a later write cannot
 * silently destroy data written by a newer version or by a partial editor.
 * @param {string} file
 */
function preserveCorruptFile(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  if (parseAnnotations(raw)) return;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = [stamp, process.pid, Math.random().toString(16).slice(2)].join('-');
  const backup = join(dirname(file), basename(file).replace(/\.json$/i, '') + '.corrupt-' + suffix + '.json');
  try {
    copyFileSync(file, backup);
  } catch {
    /* best effort: the real file is still replaced atomically below */
  }
}

/**
 * Write the whole annotation set atomically: temporary file plus rename.
 * @param {{version: number, skills: Record<string, object>}} annotations
 */
function writeAnnotations(annotations) {
  const file = annotationFilePath();
  mkdirSync(dirname(file), { recursive: true });
  preserveCorruptFile(file);
  writeFileAtomic(file, JSON.stringify(annotations, null, 2) + '\n');
}

/**
 * Overlay manual annotations on discovered skills. `manualCategory`,
 * `manualAuthor` and `manualSeries` carry the values the user typed;
 * `category` and `author` carry the effective values after the frontmatter
 * fallbacks. `series` is manual only: an unassigned skill reports an empty
 * series rather than a display bucket.
 * @param {Array<object>} skills
 * @param {{skills: Record<string, object>}} [annotations]
 * @returns {Array<object>}
 */
export function applyAnnotations(skills, annotations = readAnnotations()) {
  return skills.map((skill) => {
    const entry = annotations.skills[skill.name];
    const manualCategory = entry?.category ?? '';
    const manualAuthor = entry?.author ?? '';
    const manualSeries = entry?.series ?? '';
    return {
      ...skill,
      category: manualCategory || skill.category || UNCATEGORIZED,
      author: manualAuthor || skill.author || UNKNOWN_AUTHOR,
      series: manualSeries,
      manualCategory,
      manualAuthor,
      manualSeries,
    };
  });
}

/**
 * Validate that a skill exists, persist its category, author and series, and
 * return the updated summary. An empty or omitted field clears that manual
 * value.
 *
 * `previousSeries` turns the call into a series rename: every skill whose
 * manual series matches it trimmed and case-insensitively receives the new
 * series in the same atomic write. The addressed skill still has to exist.
 *
 * Discovery is the only await: after it resolves, the read-modify-write below
 * runs synchronously to the atomic rename. Two annotate calls in this process
 * therefore cannot interleave between reading and writing, so no extra lock is
 * needed; the atomic rename only arbitrates with external writers.
 * @param {{name: string, category?: string, author?: string, series?: string, previousSeries?: string}} input
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
  if (input.series !== undefined) {
    const value = input.series.trim();
    if (value) entry.series = value;
    else delete entry.series;
  }

  if (input.previousSeries !== undefined) {
    const previous = input.previousSeries.trim().toLowerCase();
    const target = (input.series ?? '').trim();
    if (previous !== '') {
      for (const [member, candidate] of Object.entries(annotations.skills)) {
        if (member === name) continue;
        if (String(candidate.series ?? '').trim().toLowerCase() !== previous) continue;
        if (target) candidate.series = target;
        else delete candidate.series;
        if (isEmptyEntry(candidate)) delete annotations.skills[member];
        else candidate.updatedAt = new Date().toISOString();
      }
    }
  }

  if (isEmptyEntry(entry)) delete annotations.skills[name];
  else {
    entry.updatedAt = new Date().toISOString();
    annotations.skills[name] = entry;
  }
  writeAnnotations(annotations);
  return { skill: applyAnnotations([skill], annotations)[0] };
}

/**
 * Forget a skill's annotation after the skill itself has been removed, so the
 * file cannot drift from the deck. A skill without an entry is left alone, and
 * a corrupt file is not overwritten by an empty set.
 * @param {string} name
 * @returns {boolean} whether an entry was removed
 */
export function removeAnnotation(name) {
  const annotations = readAnnotations();
  if (!Object.prototype.hasOwnProperty.call(annotations.skills, name)) return false;
  delete annotations.skills[name];
  writeAnnotations(annotations);
  return true;
}
