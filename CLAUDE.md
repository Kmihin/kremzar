# CLAUDE.md

Kmetija Kremžar website: Astro 7 + Cloudflare Workers, D1, KV sessions.
`docs/implementation-plan.md` decides behaviour. This file decides code style.
Stop and ask before deviating from either.

## Keep it simple (most important)

- Code a developer understands on first read. Plain `if`/`for`, short functions
  with one job, guard clauses and early return, at most two levels of nesting.
- No new abstractions: no base classes, generics, factories, wrappers, or utility
  files with one caller. When unsure, copy how the nearest similar feature does it.
- TypeScript strict. No `any`, no `!` to silence the compiler.
- No defensive code for cases that cannot happen. Fail loudly.
- Comments in English, only where the reason is not obvious. No dead code,
  commented-out code or `console.log`.

## Structure

- Folders: `src/pages`, `src/layouts`, `src/components`, `src/actions`, `src/models`,
  `src/consts`, `src/db`, `src/services`, `src/styles`, `src/config`, `src/assets`,
  `migrations/`, `tests/`, `docs/`.
- SQL only in `src/db/<name>Repository.ts`, one per table or aggregate.
- SQL is allowed in `tests/` for schema checks and for setting up test data.
  The behaviour under test still goes through services and repositories.
  Business rules in `src/services`. Pages call services and render.
- Small components, one responsibility each.

## Models and data

- Every data shape is a named interface, one per file, in `src/models`.
- Never build objects or anonymous shapes inside a query, map or select. Queries
  return declared models (`.all<Product>()`). A view that needs another shape gets
  its own named model, built in plain code.
- Strings that cross a boundary (statuses, error codes) are exported constants in `src/consts`.

## Styles and copy

- No inline styles: no `style=""` and no style bindings.
- Scoped component CSS using the tokens. No hard-coded colours, font sizes or
  spacing outside `src/styles/tokens.css`.
- Class names say what the thing is (`.product-card`, `.order-total`), not how it looks.
- Repeated UI becomes a component (Button, Card, Field, Badge).
- State is a class and is also written as text.
- No em or en dashes in visible text.

## Workflow

- Never stage or commit. Leave changes in the working tree; Kristjan reviews and commits.
- Change only what the milestone needs. No cleanup or refactoring outside it.
- Allowed packages only (anything else: ask first): astro, @astrojs/cloudflare,
  @astrojs/check, wrangler, typescript, vitest, @cloudflare/vitest-plugin,
  prettier, prettier-plugin-astro, @fontsource-variable packages, zod as shipped
  with Astro. Exact versions, no `^` or `~`.
- Never run `wrangler login` and never deploy.
- Before finishing a milestone: `npm run check`, `npm run build`, `npm test` and
  `npx prettier --check .` pass; changed flows walked in `astro dev` on a phone
  viewport; the checklist below run on the diff with every "no" fixed;
  `docs/milestones/m<N>.md` written.
- If a check fails, stop and report. Never change a check to make it pass.

## Review checklist

Answer each with yes or no for the diff. Every "no" gets fixed before reporting.

### Simplicity

- [ ] Would a developer understand every changed function on first read?
- [ ] Is every function short, with one job?
- [ ] Is nesting at most two levels, using guard clauses and early returns?
- [ ] Is the diff free of new base classes, generics, factories and wrappers?
- [ ] Does every new utility file have more than one caller?
- [ ] Does new code follow the pattern of the nearest similar feature?
- [ ] Is the diff free of `any` and of `!` non-null assertions?
- [ ] Is the diff free of defensive checks for cases that cannot happen?
- [ ] Are comments in English and only where the reason is not obvious?
- [ ] Is the diff free of dead code, commented-out code and `console.log`?

### Structure

- [ ] Are new files in the agreed folders?
- [ ] Is all SQL inside `src/db/*Repository.ts` (in `tests/` only for schema checks and test data)?
- [ ] Do tests exercise the behaviour through services and repositories?
- [ ] Are business rules in `src/services`, with pages only calling services and rendering?
- [ ] Does each component have one responsibility?

### Models and data

- [ ] Is every data shape a named interface, one per file, in `src/models`?
- [ ] Do queries return declared models, with no objects built inside a query, map or select?
- [ ] Does every view-specific shape have its own named model built in plain code?
- [ ] Are statuses, error codes and other boundary strings constants from `src/consts`?
- [ ] Are all queries parameterised prepared statements, with no N+1 queries?

### Styles and copy

- [ ] Is the diff free of `style=""` and style bindings?
- [ ] Do colours, font sizes and spacing come only from tokens?
- [ ] Do class names describe what the thing is, not how it looks?
- [ ] Is repeated UI a component?
- [ ] Is every state both a class and visible text?
- [ ] Is visible text free of em and en dashes?
- [ ] Is visible text Slovenian with correct č, š, ž, and are unknown facts `[TODO Kristjan: ...]` markers listed in `docs/todo-content.md`?

### Security and workflow

- [ ] Is the diff free of secrets, and are names, phone numbers and secrets never logged?
- [ ] Are errors shown by code with a Slovenian message, never exception text?
- [ ] Does every admin page and admin action go through the middleware guard?
- [ ] Do public requests avoid `Astro.session` entirely?
- [ ] Are new packages on the allowed list and pinned to exact versions?
- [ ] Does the diff change only what the milestone needs?
- [ ] Is nothing staged or committed?
