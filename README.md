# Skill Deck

[![CI](https://github.com/zliu0559/dsh-skill-deck/actions/workflows/ci.yml/badge.svg)](https://github.com/zliu0559/dsh-skill-deck/actions/workflows/ci.yml)

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that adds a **Skills** page to the left sidebar — and keeps the **Settings → Skills** section: browse every skill under your DSH user roots, switch its two invocation surfaces on or off, edit its `SKILL.md`, annotate it with a category, an author, and a series, open its folder, or move it to the trash. The same deck can be shown as a list, a grouped card wall, or a series board (the Map).

English | [中文](README.zh.md)

## Why

DSH discovers skills from disk and hot-reloads them, but the only way to change one is to edit files by hand. Skill Deck puts the same files behind a small, honest UI:

- **Open it from the sidebar** — a **Skills** entry sits after the shipped pages, while Settings → Skills keeps working.
- **Three views over one deck** — List for density, Cards grouped by category, author, or root, and a Map that is a **series board**: one module per series, drag a tile to reassign it (with rollback and undo), rename a whole series in one request, and review inferred source suggestions before applying them. The chosen view and grouping are remembered across visits.
- **Annotate without touching `SKILL.md`** — category, author, and series are stored in a plugin-owned file; frontmatter authors are imported automatically, category and series suggestions come from values already in use, and series are manual-only.
- **Organize without dragging** — desktop tiles expose a **Move to series** action and the touch details strip has its own, so keyboard and touch users can arrange the board too.
- **See what is actually loaded** — name, description, which surfaces are enabled, file count, size, last change.
- **Toggle without editing YAML** — "Model" writes `disable-model-invocation`, "Slash" writes `user-invocable`; every other byte of the file is preserved.
- **Edit the whole document** — `SKILL.md` opens in a full-text editor and is saved atomically, with a revision guard against overwriting an external change.
- **Create** a skill from a name and a one-line description; the plugin writes a
  valid `SKILL.md` and opens it for editing.
- A footer shows the plugin version, platform, and per-root counts, with a
  **Copy diagnostics** button whose text is useful in a bug report.
- **Duplicate** a skill under a new name; the copy keeps its assets and gets a
  rewritten `name:` field.
- **Delete safely** — removing a skill moves its directory to `~/.dsh/skills-trash/` instead of destroying it.

## Install

Skill Deck is a bundle plugin; it needs no build step and no runtime dependencies.

### DeepSeek Harness Desktop

1. Open **Settings → Plugins**.
2. Choose **Add plugin** and paste:

   ```text
   https://github.com/zliu0559/dsh-skill-deck/archive/refs/heads/main.tar.gz
   ```

3. Restart the app. A **Skills** entry appears in the left sidebar, and **Settings → Skills** remains available.

### Web profile

```sh
dsh plugin --profile web add github:zliu0559/dsh-skill-deck
```

Then restart `dsh web`.

### From a checkout

```sh
git clone https://github.com/zliu0559/dsh-skill-deck.git
```

Install the directory through **Settings → Plugins → Add plugin**, or `dsh plugin --profile web add <path>`.

## What it touches

| Root | Scope |
|---|---|
| `$DSH_HOME/skills` (default `~/.dsh/skills`) | read + write |
| `$DSH_AGENTS_HOME/skills` (default `~/.agents/skills`) | read + write |
| `$DSH_HOME/skill-deck/annotations.json` (default `~/.dsh/skill-deck/annotations.json`) | read + write (plugin-owned annotations only) |

Annotations are written only to that plugin-owned JSON file; tagging never rewrites `SKILL.md`. The current schema is version 2; a version 1 file is migrated on read and rewritten as version 2 on the next save. A missing file reads as no annotations. A malformed file or one written by a newer version is ignored for display and copied to an `annotations.corrupt-<timestamp>.json` sibling before the next write, so its bytes are not silently lost.

Project-level roots (`<repo>/.dsh/skills`, `<repo>/.agents/skills`) are deliberately out of scope: they belong to a workspace, not to the harness profile.

Removal moves the bundle to `$DSH_HOME/skills-trash/<timestamp>-<name>/`; flat `<name>.md` skills move to the same folder with an `.md` suffix. Nothing is recursively deleted. Deleting a skill also removes its entry from the annotation file.

## Limits

- One level deep, matching DSH discovery: `<root>/<name>/SKILL.md` or `<root>/<name>.md`.
- Skills larger than 2 MiB are refused for editing.
- A skill file that is not valid UTF-8 is listed as needing attention and cannot
  be edited, because writing it back would corrupt the original bytes.
- Renaming the `name:` field is rejected; the directory name stays the source of truth.
- The page lists files on disk, not the merged catalog of every provider — a bundled or virtual skill from another plugin is not shown.

## Development

No build step: plain ESM on both halves.

```sh
npm install   # React is a devDependency, used only by the render test
npm test
```

`test/panel.test.mjs` mounts the real panel in jsdom with a mocked backend, so
typing, toggling, saving, creating, grouping and the map are exercised as
behaviour rather than as markup.

`index.js` is the Host half (routes under `/dsh-skill-deck/*`), `client.js` is the browser module registered through `window.__ModuleLoader__` (the list, card-wall and series-board renderers live in that same no-build file), and `lib/` holds the filesystem, frontmatter and annotation logic shared by the tests.

The Host API is same-origin JSON, mounted through `webServer.register`, and every mutating request re-discovers the skill by name before touching a path, so a request cannot address a file outside the managed roots.

## Diagnostics

`GET /dsh-skill-deck/diag` reports the plugin version, whether an open page ever
loaded and rendered the browser half, and — when the Host exposes its client
registry — the composed bundle entry, revision, and URL. It is the fastest way to
tell "the page never loaded this plugin" apart from "the panel is broken".

## Security

The routes are local-only, same-origin, and refuse non-JSON writes; a request
names a skill, never a path. See [SECURITY.md](SECURITY.md) for the design and
how to report an issue.

## Roadmap

- Project-level roots (`<repo>/.dsh/skills`) with a workspace picker.
- Install a skill from a GitHub `owner/repo` source instead of only editing local ones.
- Per-root filtering once project roots exist.

## Releases

`main` holds released code and `develop` integrates work in progress. Versions
follow SemVer, and each release is a `vX.Y.Z` tag that also creates a GitHub
Release. To install a pinned version:

```text
https://github.com/zliu0559/dsh-skill-deck/archive/refs/tags/v0.3.0.tar.gz
```

The full flow is in [docs/RELEASING.md](docs/RELEASING.md).

## License

MIT
