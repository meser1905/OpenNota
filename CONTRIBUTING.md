# Contributing to OpenNota

Thank you for your interest in improving OpenNota. This guide explains how to
set up the project, how changes are organized, and what to expect from the
review process.

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). By
participating, you agree to uphold it.

## Local setup

Follow the [Getting started](./README.md#getting-started) section of the
README. In short:

```bash
git clone https://github.com/meser1905/opennota.git
cd opennota
cp .env.example .env
pnpm setup
pnpm dev
```

You need Node.js 20 LTS and pnpm 9 or newer. Nothing else: no Docker, no
database server, no Redis.

## Language policy

OpenNota is developed in English but serves a Spanish-speaking audience.

- **English:** all source code, code comments, commit messages, branch names,
  pull request descriptions and documentation.
- **Spanish:** all user-facing strings, which live in
  `apps/web/messages/es.json`.

Keeping these separate lets contributors collaborate in English while users see
a consistent Spanish interface.

## Branch naming

Create a branch off `master` using one of these prefixes:

- `feat/` for a new feature, for example `feat/attendance-tracking`.
- `fix/` for a bug fix, for example `fix/grade-rounding`.
- `docs/` for documentation only, for example `docs/api-examples`.
- `chore/` for tooling, dependencies or maintenance, for example `chore/bump-prisma`.
- `refactor/` for changes that do not alter behavior, for example `refactor/grades-service`.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/).
This is enforced by commitlint through a Git hook. The format is:

```text
<type>(<optional scope>): <short summary>
```

Common types are `feat`, `fix`, `docs`, `chore`, `refactor`, `test` and
`style`. Examples:

```text
feat(grades): add batch grade entry endpoint
fix(auth): reject refresh tokens after logout
docs(readme): clarify the zero-install prerequisites
refactor(reports): extract report card PDF builder
test(grades): cover weighted average with absences
```

Keep the summary short and in the imperative mood ("add", not "added").

## Pull request process

1. Fork the repository and create a branch using the naming convention above.
2. Make your change. Keep pull requests focused on a single concern.
3. Run the full local check before pushing:
   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```
4. Push your branch and open a pull request against `master`. The pull request
   template will prompt you for a description, the type of change and a
   checklist.
5. Continuous integration runs lint, typecheck, test and build on every pull
   request. All checks must pass.
6. A maintainer reviews the change. Address review comments by pushing
   additional commits to the same branch.

### Pull request checklist

- [ ] The branch name uses a valid prefix.
- [ ] Commits follow Conventional Commits.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` all pass.
- [ ] New or changed behavior has test coverage.
- [ ] User-facing strings are in Spanish; code, comments and docs are in English.
- [ ] Documentation is updated if behavior or setup changed.

## Code style

- TypeScript everywhere, with strict typing. Avoid `any`.
- Formatting is handled by Prettier; linting by ESLint. Run `pnpm format` and
  `pnpm lint` before committing. A pre-commit hook formats and lints staged
  files automatically.
- Validate all external input with Zod schemas from `@opennota/shared`.
- Keep business logic in NestJS services, not controllers.

## How to add a backend module

The API groups features into NestJS modules under `apps/api/src/modules`. To
add one, for example `attendance`:

1. Create `apps/api/src/modules/attendance/` with an `attendance.module.ts`, an
   `attendance.controller.ts` and an `attendance.service.ts`. Use an existing
   module such as `evaluations` as a reference.
2. If the feature needs new persisted data, add the models to
   `packages/db/prisma/schema.prisma` and create a migration with
   `pnpm db:migrate`.
3. Add or extend Zod schemas in `packages/shared/src/schemas` and export them
   from the package. Controllers validate request bodies with `ZodValidationPipe`.
4. Protect routes with the `@Roles(...)` decorator as appropriate. Routes are
   authenticated by default; mark public routes with `@Public()`.
5. Register the new module in `apps/api/src/app.module.ts`.
6. Add unit tests for the service.

## How to add a UI string

The web app uses `next-intl`. All user-facing text is keyed in
`apps/web/messages/es.json`.

1. Open `apps/web/messages/es.json` and add your key under the relevant
   namespace, for example `evaluations`. Keep keys descriptive and the values
   in Spanish.
2. In a component, read the string with the `useTranslations` hook:
   ```tsx
   const t = useTranslations('evaluations');
   return <h1>{t('title')}</h1>;
   ```
3. Do not hard-code user-facing text in components. Only English appears in
   code; Spanish lives in the messages file.

The single-locale setup is intentional and ready for more locales: adding
`messages/<locale>.json` and resolving the locale in `apps/web/i18n/request.ts`
is all that a second language needs.

## How to write tests

- **Unit tests** use Vitest and sit next to the code they cover, named
  `*.spec.ts` or `*.test.ts`. Pure logic, such as
  `apps/api/src/modules/grades/grade-calculation.ts`, should be tested directly.
- **End-to-end tests** use Playwright and live in the web app. Install the
  browsers once with `pnpm exec playwright install`, then run `pnpm test:e2e`.
- Run `pnpm test` before opening a pull request. The end-to-end suite is not
  run in continuous integration, so run it locally when your change affects
  user flows.

## First-time contributors

Welcome. A few tips to get started:

- Read [docs/architecture.md](./docs/architecture.md) and
  [docs/domain-model.md](./docs/domain-model.md) for the big picture.
- Look for issues labeled `good first issue`.
- Small, focused pull requests are easier to review and merge.
- If you are unsure about an approach, open an issue or a draft pull request to
  discuss it before investing a lot of time.
- Questions are welcome in
  [GitHub Discussions](https://github.com/meser1905/opennota/discussions).
