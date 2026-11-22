# Skill Deck

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin that adds a **Skills** page to Settings: browse every skill under your DSH user roots, switch its two invocation surfaces on or off, edit its `SKILL.md`, open its folder, or move it to the trash.

English | [中文](README.zh.md)

## Why

DSH discovers skills from disk and hot-reloads them, but the only way to change one is to edit files by hand. Skill Deck puts the same files behind a small, honest UI:

- **See what is actually loaded** — name, description, which surfaces are enabled, file count, size, last change.
- **Toggle without editing YAML** — "Model" writes `disable-model-invocation`, "Slash" writes `user-invocable`; every other byte of the file is preserved.
- **Edit the whole document** — `SKILL.md` opens in a full-text editor and is saved atomically, with a revision guard against overwriting an external change.
- **Delete safely** — removing a skill moves its directory to `~/.dsh/skills-trash/` instead of destroying it.

## Install

Skill Deck is a bundle plugin; it needs no build step and no runtime dependencies.

### DeepSeek Harness Desktop

1. Open **Settings → Plugins**.
2. Choose **Add plugin** and paste:

   ```text
   https://github.com/zliu0559/dsh-skill-deck/archive/refs/heads/main.tar.gz
   ```

3. Restart the app. **Settings → Skills** appears.

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

Project-level roots (`<repo>/.dsh/skills`, `<repo>/.agents/skills`) are deliberately out of scope: they belong to a workspace, not to the harness profile.

Removal moves the bundle to `$DSH_HOME/skills-trash/<timestamp>-<name>/`; flat `<name>.md` skills move to the same folder with an `.md` suffix. Nothing is recursively deleted.

## Limits

- One level deep, matching DSH discovery: `<root>/<name>/SKILL.md` or `<root>/<name>.md`.
- Skills larger than 2 MiB are refused for editing.
- Renaming the `name:` field is rejected; the directory name stays the source of truth.
- The page lists files on disk, not the merged catalog of every provider — a bundled or virtual skill from another plugin is not shown.

## Development

No build step: plain ESM on both halves.

```sh
npm install   # React is a devDependency, used only by the render test
npm test
```

`index.js` is the Host half (routes under `/dsh-skill-deck/*`), `client.js` is the browser module registered through `window.__ModuleLoader__`, and `lib/` holds the filesystem and frontmatter logic shared by the tests.

The Host API is same-origin JSON, mounted through `webServer.register`, and every mutating request re-discovers the skill by name before touching a path, so a request cannot address a file outside the managed roots.

## License

MIT
