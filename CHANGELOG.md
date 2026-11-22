# Changelog

## 0.2.0 — unreleased

- **New skill** button: create a skill from a name and a one-line description,
  in `~/.dsh/skills` or `~/.agents/skills`, then land straight in the editor.
- The plugin creates `<root>/<name>/SKILL.md` with valid frontmatter (quoting the
  description when it needs it) and refuses duplicate or non-kebab-case names.
- A footer shows the plugin version, platform, and how many skills each root
  holds, with a **Copy diagnostics** action for bug reports.

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
