# @opennota/config

Shared configuration for the OpenNota monorepo. Not published; consumed only by
workspace packages.

## Contents

| Path                      | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `typescript/base.json`    | Strict TypeScript base (extended by the others). |
| `typescript/nest.json`    | NestJS backend (`apps/api`).                     |
| `typescript/next.json`    | Next.js frontend (`apps/web`).                   |
| `typescript/library.json` | Plain TypeScript libraries (`packages/*`).       |
| `eslint/base.mjs`         | Base ESLint flat config (TypeScript-aware).      |
| `eslint/nest.mjs`         | ESLint flat config for the backend.              |
| `eslint/next.mjs`         | ESLint flat config for the frontend.             |
| `prettier/index.mjs`      | Shared Prettier config.                          |
| `tailwind/index.cjs`      | Shared Tailwind preset (shadcn/ui tokens).       |

## Usage

```jsonc
// tsconfig.json
{ "extends": "@opennota/config/typescript/nest.json" }
```

```js
// eslint.config.mjs
export { default } from '@opennota/config/eslint/nest.mjs';
```
