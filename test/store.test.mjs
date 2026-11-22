import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

const home = mkdtempSync(join(tmpdir(), 'skill-deck-'));
process.env.DSH_HOME = home;
process.env.DSH_AGENTS_HOME = join(home, 'agents');

const { listSkills, readSkill, removeSkill, saveSkill, toggleSkill } = await import('../lib/store.js');

function writeSkill(name, extra = '') {
  const dir = join(home, 'skills', name);
  mkdirSync(dir, { recursive: true });
  const lines = ['---', `name: ${name}`, 'description: Test skill.'];
  if (extra) lines.push(extra);
  lines.push('---', '', '# Body', '');
  writeFileSync(join(dir, 'SKILL.md'), lines.join('\n'), 'utf8');
  writeFileSync(join(dir, 'notes.md'), 'asset', 'utf8');
  return dir;
}

test('lists bundle skills with metadata', async () => {
  writeSkill('alpha');
  const { skills } = await listSkills();
  const alpha = skills.find((skill) => skill.name === 'alpha');
  assert.ok(alpha);
  assert.equal(alpha.isBundle, true);
  assert.equal(alpha.modelInvocable, true);
  assert.equal(alpha.userInvocable, true);
  assert.equal(alpha.files, 2);
  assert.ok(alpha.bytes > 0);
});

test('toggles the model surface and reports the new state', async () => {
  const result = await toggleSkill({ name: 'alpha', surface: 'model', enabled: false });
  assert.equal(result.skill.modelInvocable, false);
  const content = readFileSync(join(home, 'skills', 'alpha', 'SKILL.md'), 'utf8');
  assert.ok(content.includes('disable-model-invocation: true'));
  const again = await toggleSkill({ name: 'alpha', surface: 'model', enabled: true });
  assert.equal(again.skill.modelInvocable, true);
  assert.ok(!readFileSync(join(home, 'skills', 'alpha', 'SKILL.md'), 'utf8').includes('disable-model-invocation: true'));
});

test('reads and saves a document with a revision guard', async () => {
  const { content, revision } = await readSkill('alpha');
  assert.ok(content.includes('# Body'));
  const edited = content.replace('# Body', '# Edited body');
  const saved = await saveSkill({ name: 'alpha', content: edited, revision });
  assert.notEqual(saved.revision, revision);
  assert.ok(readFileSync(join(home, 'skills', 'alpha', 'SKILL.md'), 'utf8').includes('# Edited body'));
  await assert.rejects(
    () => saveSkill({ name: 'alpha', content: edited, revision }),
    (error) => error.status === 409,
  );
});

test('rejects a name that no longer matches the directory', async () => {
  const { content } = await readSkill('alpha');
  const renamed = content.replace('name: alpha', 'name: beta');
  await assert.rejects(
    () => saveSkill({ name: 'alpha', content: renamed }),
    (error) => error.status === 400,
  );
});

test('removes a skill into the trash directory', async () => {
  await assert.rejects(
    () => removeSkill({ name: 'alpha', confirm: 'nope' }),
    (error) => error.status === 400,
  );
  const result = await removeSkill({ name: 'alpha', confirm: 'alpha' });
  assert.ok(result.trashedTo.includes('skills-trash'));
  assert.ok(existsSync(result.trashedTo));
  assert.ok(!existsSync(join(home, 'skills', 'alpha')));
  const { skills } = await listSkills();
  assert.equal(skills.length, 0);
});

test('refuses unknown or escaping names', async () => {
  await assert.rejects(
    () => readSkill('missing'),
    (error) => error.status === 404,
  );
  await assert.rejects(
    () => readSkill('../etc/passwd'),
    (error) => error.status === 404,
  );
});
