---
name: add-new-feature
description: Start work on a new feature, fix or change in the open-poll-slide fork by creating a branch off main. Use when the user types /add-new-feature, or says they want to start a new feature, fix or change. Takes an optional branch name.
---

# Add a new feature

This only starts the work. Building happens in the conversation afterwards, and `launch-new-features` wraps it up.

1. **Name.** Use the argument as the branch name. If none was given, ask the user for one (short, kebab-case, e.g. `ranking-tie-breaks`). Strip a leading `feature/` or similar if they typed it; don't add prefixes.
2. **Check the tree.** `git status --short`. If there are uncommitted changes (ignore untracked `.idea/`), tell the user and ask whether to carry them onto the new branch or stop. Never discard them.
3. **Branch from an up-to-date `main`.** `git fetch origin`, then `git checkout -b <name> origin/main`. If already on a non-`main` branch with unmerged work, say so and ask before branching.
4. **Hand over.** Say the branch is ready and remind them: commit as often as they like, then run `/launch-new-features` when happy.

While they build, follow `CLAUDE.md`: no comments unless the WHY is non-obvious, no casual dependencies, leave `components/ui` alone, never hand-edit versions or `CHANGELOG.md`. A new prop on a poll or tool component, or new field on a question object, needs an entry in `packages/core/src/app/lib/inspector/component-fields.ts` with labels in every locale (`en`, `es`, `fr-ca`, `ja`, `zh-cn`, `zh-tw`) and must pass through `fieldsAttr`.
