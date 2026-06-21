# Script Rules

This directory contains one-off data inspection and maintenance scripts.

## Required Header

Every script must start with a short description and the exact command to run it.

```ts
// catalog가 NULL인 Song 중 JPOP으로 추정되는 후보를 출력하는 스크립트.
// pnpm tsx src/scripts/find-null-catalog-jpop-candidates.ts
```

## Execution

- Run scripts directly with `pnpm tsx`.
- Do not add a `package.json` script unless explicitly requested.
- Load database configuration from `.env`.
- Require `DATABASE_URL`; do not hardcode a fallback database URL.

## Dependencies

- Prefer `pg` for data scripts.
- Do not use Prisma for ad hoc inspection or cleanup scripts unless explicitly requested.
- Do not introduce another ORM, such as TypeORM, for script-only work.

## CLI Arguments

- Do not add CLI flags or parameters unless explicitly requested.
- Keep the script behavior fixed and visible in the source.

## Data Changes

- For write/delete scripts, create a backup first unless explicitly told not to.
- Backups should be written under `/Users/yuchan/developer/song/backup`.
- Prefer custom-format PostgreSQL dumps:

```bash
pg_dump -Fc -f /Users/yuchan/developer/song/backup/<name>.dump
```

