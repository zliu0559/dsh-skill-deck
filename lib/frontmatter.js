/**
 * Minimal, dependency-free YAML-frontmatter handling for skill files.
 *
 * Only the subset a `SKILL.md` needs is understood: top-level `key: value`
 * pairs, quoted scalars, literal/folded block scalars, and booleans. Anything
 * else is preserved verbatim, because the only writer here (surface toggles)
 * edits a single boolean line and never re-serialises the document.
 */

const TRUE_VALUES = new Set(['true', 'yes', 'on', '1']);
const FALSE_VALUES = new Set(['false', 'no', 'off', '0']);

/**
 * Split a Markdown document into its YAML frontmatter and body.
 * @param {string} text
 * @returns {{eol: string, frontmatter: string, body: string, bodyOffset: number} | null}
 */
export function splitFrontmatter(text) {
  if (typeof text !== 'string') return null;
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/\r?\n/);
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start += 1;
  if (start >= lines.length || lines[start].trim() !== '---') return null;
  let end = -1;
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === '---' || line.trim() === '...') {
      end = i;
      break;
    }
  }
  if (end === -1) return null;
  const frontmatter = lines.slice(start + 1, end).join(eol);
  const body = lines.slice(end + 1).join(eol);
  return { eol, frontmatter, body, bodyOffset: 0 };
}

function unquote(raw) {
  const value = raw.trim();
  if (value.length >= 2 && value[0] === "'" && value[value.length - 1] === "'") {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
    return value
      .slice(1, -1)
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
  }
  return null;
}

function stripPlainComment(value) {
  let quoted = null;
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    if (quoted) {
      if (char === quoted && value[i - 1] !== '\\') quoted = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quoted = char;
      continue;
    }
    if (char === '#' && (i === 0 || /\s/.test(value[i - 1]))) return value.slice(0, i).trimEnd();
  }
  return value.trimEnd();
}

/**
 * Parse the frontmatter block of a skill document.
 * @param {string} text full file content
 * @returns {{data: Record<string, unknown>, body: string, eol: string, frontmatter: string} | null}
 */
export function parseFrontmatter(text) {
  const parts = splitFrontmatter(text);
  if (!parts) return null;
  const lines = parts.frontmatter.split(/\r?\n/);
  const data = {};
  for (let i = 0; i < lines.length; i += 1) {
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(lines[i]);
    if (!match) continue;
    const key = match[1];
    const rest = match[2];
    const indent = lines[i].length - lines[i].trimStart().length;
    if (indent !== 0) continue;
    if (rest === '' || rest.startsWith('#')) {
      data[key] = '';
      continue;
    }
    const indicator = /^([|>])([+-]?)(\d*)\s*(?:#.*)?$/.exec(rest);
    if (indicator) {
      const style = indicator[1];
      const chomp = indicator[2];
      const blockLines = [];
      let j = i + 1;
      for (; j < lines.length; j += 1) {
        const line = lines[j];
        if (line.trim() === '') {
          blockLines.push('');
          continue;
        }
        if (line.length - line.trimStart().length === 0) break;
        blockLines.push(line);
      }
      const contentIndent = blockLines.reduce((min, line) => {
        if (line.trim() === '') return min;
        const indentSize = line.length - line.trimStart().length;
        return min === null || indentSize < min ? indentSize : min;
      }, null);
      const dedented = blockLines.map((line) => (line.trim() === '' ? '' : line.slice(contentIndent ?? 0)));
      let value = style === '|' ? dedented.join('\n') : dedented.join(' ').replace(/\s+/g, ' ').trim();
      if (chomp === '-') value = value.replace(/\n+$/, '');
      else if (chomp !== '+') value = value.replace(/\n+$/, '') + (style === '|' ? '\n' : '');
      data[key] = value;
      i = j - 1;
      continue;
    }
    if (rest.trimStart().startsWith('"') || rest.trimStart().startsWith("'")) {
      let raw = rest.trimStart();
      let j = i;
      const quote = raw[0];
      while (j + 1 < lines.length) {
        const parsed = unquote(raw);
        if (parsed !== null) break;
        j += 1;
        raw += '\n' + lines[j].trim();
      }
      const parsed = unquote(raw);
      data[key] = parsed === null ? stripPlainComment(raw) : parsed;
      i = j;
      continue;
    }
    // Plain scalar, possibly continued on more-indented lines.
    const pieces = [stripPlainComment(rest)];
    let j = i + 1;
    for (; j < lines.length; j += 1) {
      const line = lines[j];
      if (line.trim() === '') break;
      if (line.length - line.trimStart().length === 0) break;
      if (/^[A-Za-z][A-Za-z0-9_-]*\s*:/.test(line.trim()) && line.length - line.trimStart().length === 0) break;
      pieces.push(line.trim());
    }
    data[key] = pieces.join(' ').trim();
    i = j - 1;
  }
  return { data, body: parts.body, eol: parts.eol, frontmatter: parts.frontmatter };
}

function scalarValue(raw) {
  const value = raw.trim();
  if (value === '' || value.startsWith('#')) return '';
  const unquoted = unquote(value);
  return (unquoted === null ? stripPlainComment(value) : unquoted).trim();
}

/**
 * Read a scalar from an indentation-nested mapping in the frontmatter block.
 * Only block mappings with scalar leaves are understood, which is all
 * `metadata.author` and `metadata.credits.author` need.
 * @param {ReturnType<typeof parseFrontmatter>} parsed
 * @param {string[]} path
 * @returns {string | undefined}
 */
export function nestedStringField(parsed, path) {
  if (!parsed || typeof parsed.frontmatter !== 'string' || !Array.isArray(path) || path.length === 0) {
    return undefined;
  }
  const lines = parsed.frontmatter.split(/\r?\n/);
  let start = 0;
  let end = lines.length;
  let indent = 0;
  for (let depth = 0; depth < path.length; depth += 1) {
    let found = -1;
    let rest = '';
    for (let i = start; i < end; i += 1) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent < indent) break;
      if (lineIndent > indent) continue;
      const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line.trim());
      if (match && match[1] === path[depth]) {
        found = i;
        rest = match[2];
        break;
      }
    }
    if (found === -1) return undefined;
    if (depth === path.length - 1) {
      const value = scalarValue(rest);
      return value === '' ? undefined : value;
    }
    if (rest.trim() !== '') return undefined;
    let childIndent = null;
    let childEnd = end;
    for (let i = found + 1; i < end; i += 1) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const lineIndent = line.length - line.trimStart().length;
      if (lineIndent <= indent) {
        childEnd = i;
        break;
      }
      if (childIndent === null) childIndent = lineIndent;
      else if (lineIndent < childIndent) {
        childEnd = i;
        break;
      }
    }
    if (childIndent === null) return undefined;
    start = found + 1;
    end = childEnd;
    indent = childIndent;
  }
  return undefined;
}

/**
 * Read a string field, tolerating non-string values.
 * @param {Record<string, unknown>} data
 * @param {string} key
 * @returns {string | undefined}
 */
export function stringField(data, key) {
  const value = data?.[key];
  if (typeof value !== 'string') return undefined;
  return value;
}

/**
 * Read an optional boolean field. `undefined` means "not declared".
 * @param {Record<string, unknown>} data
 * @param {string} key
 * @returns {boolean | undefined}
 */
export function booleanField(data, key) {
  const value = data?.[key];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalised = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalised)) return true;
  if (FALSE_VALUES.has(normalised)) return false;
  return undefined;
}

/**
 * Rewrite one boolean key in the frontmatter, preserving every other byte.
 * @param {string} text full file content
 * @param {string} key frontmatter key
 * @param {boolean} value
 * @returns {{text: string, changed: boolean}}
 */
export function setBoolean(text, key, value) {
  const parts = splitFrontmatter(text);
  if (!parts) throw new Error('SKILL.md has no YAML frontmatter');
  const eol = parts.eol;
  const lines = parts.frontmatter.split(/\r?\n/);
  const literal = value ? 'true' : 'false';
  const pattern = new RegExp('^' + key.replace(/[-]/g, '\\-') + '\\s*:');
  const index = lines.findIndex((line) => pattern.test(line) && line.length - line.trimStart().length === 0);
  if (index !== -1) {
    const current = /:\s*(.*)$/.exec(lines[index])?.[1] ?? '';
    if (current.trim().toLowerCase() === literal) return { text, changed: false };
    lines[index] = key + ': ' + literal;
  } else {
    let insertAt = lines.length;
    while (insertAt > 0 && lines[insertAt - 1].trim() === '') insertAt -= 1;
    lines.splice(insertAt, 0, key + ': ' + literal);
  }
  const header = ['---', ...lines, '---'].join(eol);
  return { text: header + eol + parts.body, changed: true };
}

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FLAT_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Validate a skill document before it is written back.
 * @param {string} text
 * @param {{expectedName?: string, allowFlat?: boolean}} [options]
 * @returns {{ok: true, name: string, description: string} | {ok: false, error: string}}
 */
export function validateSkillDocument(text, options = {}) {
  const parsed = parseFrontmatter(text);
  if (!parsed) return { ok: false, error: 'missing YAML frontmatter' };
  const name = stringField(parsed.data, 'name');
  const description = stringField(parsed.data, 'description');
  if (!name || !name.trim()) return { ok: false, error: 'frontmatter requires a name' };
  if (!description || !description.trim()) return { ok: false, error: 'frontmatter requires a description' };
  const validName = options.allowFlat ? FLAT_NAME_PATTERN.test(name.trim()) : NAME_PATTERN.test(name.trim());
  if (!validName) return { ok: false, error: `invalid skill name "${name.trim()}"` };
  if (options.expectedName && name.trim() !== options.expectedName) {
    return { ok: false, error: `name must stay "${options.expectedName}" to match its directory` };
  }
  return { ok: true, name: name.trim(), description: description.trim() };
}
