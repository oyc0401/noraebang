# Prisma migration baseline

This server already has data in PostgreSQL. Do not run the initial migration
against that database directly, because it contains `CREATE TABLE` statements
for tables that already exist.

Use this once when connecting Prisma Migrate to the existing database:

```sh
cd server
set -a; source .env; set +a
pg_dump "${DATABASE_URL%%\?*}" --schema=public > before-prisma-baseline.sql
pnpm prisma migrate resolve --applied 0_init
pnpm prisma migrate status
```

After `0_init` is marked as applied, normal schema changes can use:

```sh
cd server
pnpm prisma migrate dev --name <change-name>
```

For production or shared databases, apply committed migrations with:

```sh
cd server
pnpm prisma migrate deploy
```
