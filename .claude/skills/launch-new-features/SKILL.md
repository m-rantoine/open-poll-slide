---
name: launch-new-features
description: Wrap up the current open-poll-slide feature branch and make it ready to ship — checks, tests, changeset, commit, push and PR. Use when the user types /launch-new-features, or says the feature is done, finished, ready, or asks to wrap up, ship or release it.
---

# Launch new features

Run from the feature branch. Stop and report on any failure; don't paper over it.

1. **Preflight.** `git branch --show-current` must not be `main`. `git status --short` and `git log --oneline origin/main..HEAD` show what is being shipped. If nothing differs from `main`, say so and stop.
2. **Checks.** `pnpm check:fix`, `pnpm typecheck`, `pnpm test`. Fix what fails (new locale keys missing in `fr-ca`, inspector hooks missing for a new prop, and so on) and rerun until green. Report any failure that isn't clearly caused by this branch.
3. **Changeset.** If the diff touches `packages/core` or `packages/cli` and there is no new file in `.changeset/` yet, create one. Packages are `@rantoine/open-poll-slide-core` and `@rantoine/open-poll-slide-cli`. Pick the bump from the diff: `patch` fixes and polish, `minor` new public API or poll types, `major` breaking. State the bump and one-line description to the user before writing. Format: one present-tense line from the user's side, matching existing `.changeset/*.md`. `apps/*` and root-only changes need none. Never run `changeset version` or edit versions or `CHANGELOG.md`.
4. **Commit and push.** Commit the changeset and any fixes (`git add` specific files, never `.idea/`). Then `git push -u origin <branch>`.
5. **Open the PR** to `main` with `gh pr create`: a short title, a body summarising the change and the bump.
6. **What happens next.** Tell the user:
   - Merge the PR when ready.
   - The Release workflow then opens or updates "chore: release packages". If this release adds a new minor or major, add the `/changelog` page entry (the `changelog-entry` skill) as the last commit on that PR, and run the pack-and-install check from `CLAUDE.md` before publishing core.
   - Merging the release PR publishes core then the CLI to npm. That merge is theirs; never merge it or run `pnpm release` yourself.
