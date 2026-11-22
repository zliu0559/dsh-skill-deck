# Releasing Skill Deck

Skill Deck uses two long-lived branches and SemVer tags.

## Branches

| Branch | Meaning |
|---|---|
| `main` | Released code. Every commit here is a tag, and every tag is a release. |
| `develop` | Integration branch. Features and fixes land here first. |
| `feat/<topic>`, `fix/<topic>` | Optional short-lived branches off `develop`. |

Rules of thumb:

- Never commit a feature directly to `main`; merge a release from `develop`.
- `main` only ever moves by merging `develop` at release time.
- A tag is created on `main`, never on `develop`.

## Versions

`package.json` `version` and the top section of `CHANGELOG.md` are the same
number, and a git tag `v<version>` names that commit.

- **Patch** (`0.2.x`): fixes, docs, tests — no new user-visible surface.
- **Minor** (`0.x.0`): a new capability (new panel action, new root, new dialog).
- **Major** (`x.0.0`): a breaking change for people installing the plugin: a
  removed route, an incompatible config shape, or a renamed package.

While work is in progress the version is bumped once, at release time, not per
commit. `CHANGELOG.md` keeps an `Unreleased` section for work that has not
shipped yet.

## Release checklist

1. On `develop`, run the full suite:

   ```sh
   npm test
   ```

2. Move the `Unreleased` items in `CHANGELOG.md` under a new
   `## <version> — YYYY-MM-DD` heading, and set the same version in
   `package.json`.
3. Commit: `chore(release): <version>`.
4. Merge into `main` and tag the merge commit:

   ```sh
   git checkout main
   git merge --no-ff develop -m "release: <version>"
   git tag -a v<version> -m "Skill Deck <version>"
   git push origin main
   git push origin v<version>
   ```

5. The tag push runs `.github/workflows/release.yml`, which builds the GitHub
   Release notes from the tag and the changelog. Check the release page.
6. Return to `develop` (`git checkout develop`) so the next cycle starts on the
   integration branch.

## After a release

- `main` and `develop` are at the same commit right after the merge; continue on
  `develop` and let it diverge again.
- Do not rewrite or move a published tag; ship a follow-up patch instead.
- The plugin itself has no build step, so a release is only a tag: installing
  `https://github.com/zliu0559/dsh-skill-deck/archive/refs/tags/v<version>.tar.gz`
  gives exactly that commit.
