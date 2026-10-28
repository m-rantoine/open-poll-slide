---
name: add-new-feature
description: Make a change to the open-poll-slide fork (a feature, fix or polish) the right way — branch, code, inspector hooks, changeset, checks, PR. Use whenever the user wants to add, change or fix something in packages/core, packages/cli, apps/demo or apps/web, or says "add a feature", "fix this", "new poll type".
---

# Add a new feature

1. **Branch.** From a clean `main`: `git checkout -b <short-name>`. Never work on `main`.
2. **Read `CLAUDE.md` first.** Its hard rules apply: no comments unless the WHY is non-obvious, no casual dependencies, leave `components/ui` alone, never hand-edit versions or `CHANGELOG.md`.
3. **Make the change.** New poll or tool prop, or new field on a question object: add it to `packages/core/src/app/lib/inspector/component-fields.ts` with labels in **every** locale (`en`, `es`, `fr-ca`, `ja`, `zh-cn`, `zh-tw`), and pass the values through `fieldsAttr`.
4. **Add a changeset** when `packages/core` or `packages/cli` changed. Write the file in `.changeset/<kebab-name>.md`:
   ```md
   ---
   "@rantoine/open-poll-slide-core": minor
   ---

   One present-tense line from the user's side.
   ```
   Package names are `@rantoine/open-poll-slide-core` and `@rantoine/open-poll-slide-cli`. Bump: `patch` fixes and polish, `minor` new public API, `major` breaking. `apps/*` and root tooling need none.
5. **Verify.** `pnpm check:fix`, `pnpm typecheck`, `pnpm test`. To see it working, run `pnpm dev`.
6. **Commit and open a PR** to `main`. Do not run `changeset version` or touch versions; releasing is the `launch-new-features` skill.
