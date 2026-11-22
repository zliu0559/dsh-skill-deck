# Security

Skill Deck edits files on your machine, so its exposure is deliberately small.

## Design

- **Local only.** The Host half mounts its routes on the Harness web server, which
  binds `127.0.0.1` by default. Do not expose a Harness instance to a network you
  do not control while this plugin is installed.
- **Same-origin writes.** Every request is checked before it reaches a handler:
  a mismatched `Origin`, a `sec-fetch-site` of `cross-site`, or a write without
  `content-type: application/json` is refused with 403/415. This blocks a page on
  another origin from driving the API through the browser.
- **No path from the client.** A request names a skill, never a path. Each
  operation re-discovers the skill under the managed roots and refuses anything
  that does not resolve to `<root>/<name>/SKILL.md` or `<root>/<name>.md`.
- **No destructive delete.** Removing a skill renames its directory into
  `$DSH_HOME/skills-trash/`; the plugin never recursively deletes a skill.
- **No network activity.** The plugin has no runtime dependencies and makes no
  outbound requests.

## Reporting

Open an issue at <https://github.com/zliu0559/dsh-skill-deck/issues> with the
plugin version (shown in Settings → Plugins), the Harness version, and the steps
to reproduce. Please do not include credentials or the contents of private skills.
