# Changelog

## 0.1.1 — unreleased

- Filter options now show how many skills each one matches, and the header shows
  `visible / total` while a search or filter is active.
- The editor offers a **Reload** action when the file changed on disk, instead of
  only refusing the save.
- The search field and filter expose accessible labels; the toast announces
  results to screen readers.

## 0.1.0 — 2026-11-22

- First release: Settings → Skills lists every skill under `$DSH_HOME/skills`
  and `$DSH_AGENTS_HOME/skills`.
- Toggle the model (`disable-model-invocation`) and slash (`user-invocable`)
  surfaces without rewriting the rest of the file.
- Edit the whole `SKILL.md` with an atomic write and a revision guard.
- Move a skill to `$DSH_HOME/skills-trash/` instead of deleting it.
- Open a skill's folder in the OS file manager.
