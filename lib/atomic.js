/**
 * One atomic write for every file this plugin owns: a temporary sibling plus a
 * rename, so a crash can never leave a half-written document behind.
 *
 * The temporary name carries the pid, a timestamp and a random suffix so two
 * writers can never share a scratch file.
 */
import { renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

/**
 * @param {string} filePath destination; its directory must exist
 * @param {string} content UTF-8 text
 */
export function writeFileAtomic(filePath, content) {
  const suffix = [process.pid, Date.now(), Math.random().toString(16).slice(2)].join('.');
  const temporary = join(dirname(filePath), '.' + basename(filePath) + '.' + suffix + '.tmp');
  writeFileSync(temporary, content, 'utf8');
  renameSync(temporary, filePath);
}
