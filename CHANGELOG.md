# Changelog

All notable changes to this plugin are documented here. Versions follow
[Semantic Versioning](https://semver.org/), and every released version is a
`vX.Y.Z` tag on `main`. See [docs/RELEASING.md](docs/RELEASING.md) for the
branch and release flow.

## Unreleased

- Nothing yet.

## 0.3.0 — 2026-11-22

- **Duplicate** action on every skill row: copies the whole bundle (or the flat
  `.md` file) under a new kebab-case name and rewrites the `name:` field, so the
  copy is immediately valid.
- The duplicate dialog pre-fills `<name>-copy`, refuses collisions and invalid
  names, and reloads the list so the new copy appears in place.
- Release engineering: `docs/RELEASING.md` documents the `main`/`develop` model,
  the SemVer rules, and the tag-based release checklist; a `Release` workflow
  publishes GitHub release notes from a `v*` tag.

## 0.2.0 — 2026-11-22

- **New skill** button: create a skill from a name and a one-line description,
  in `~/.dsh/skills` or `~/.agents/skills`, then land straight in the editor.
- The plugin creates `<root>/<name>/SKILL.md` with valid frontmatter (quoting the
  description when it needs it) and refuses duplicate or non-kebab-case names.
- A footer shows the plugin version, platform, and how many skills each root
  holds, with a **Copy diagnostics** action for bug reports.
- The browser half pings `/signal` when it loads and when the panel renders, so
  `/state` and `/diag` can distinguish "never loaded" from "loaded but empty".
- The panel is covered by a jsdom interaction test: typing filters the list, the
  model switch posts the expected toggle, editing saves the typed content with
  its revision, and the create dialog posts the new skill.

## 0.1.1 — 2026-11-22

- Filter options now show how many skills each one matches, and the header shows
  `visible / total` while a search or filter is active.
- The editor offers a **Reload** action when the file changed on disk, instead of
  only refusing the save.
- The search field and filter expose accessible labels; the toast announces
  results to screen readers.
- Skills behind a symlink or junction are discovered like ordinary directories.
- A `SKILL.md` that is not valid UTF-8 is reported as needing attention and is
  refused for editing, instead of being rewritten with replacement characters.

## 0.1.0 — 2026-11-22

- First release: Settings → Skills lists every skill under `$DSH_HOME/skills`
  and `$DSH_AGENTS_HOME/skills`.
- Toggle the model (`disable-model-invocation`) and slash (`user-invocable`)
  surfaces without rewriting the rest of the file.
- Edit the whole `SKILL.md` with an atomic write and a revision guard.
- Move a skill to `$DSH_HOME/skills-trash/` instead of deleting it.
- Open a skill's folder in the OS file manager.
