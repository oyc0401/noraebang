# JPOP Server

New NestJS backend for the JPOP service.

## Local setup

```bash
cd server
cp .env.example .env
docker compose up -d postgres
pnpm prisma:generate
pnpm start:dev
```

The server starts on `http://localhost:3002` by default.

- `GET /` checks the Nest app.
- `GET /health/db` checks the PostgreSQL connection.
- `GET /api` opens Swagger.

## PostgreSQL

The local Docker database is created from `server/docker-compose.yml`.

```yaml
POSTGRES_DB: jpop
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres
```

Connection string:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/jpop?schema=public"
```

Port `5433` is used on the host so it can run next to another local PostgreSQL on `5432`.

If you already have PostgreSQL installed locally and do not want Docker:

```bash
createdb jpop
```

Then use a matching local URL, for example:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/jpop?schema=public"
```

## Prisma

Add models in `prisma/schema.prisma`, then run:

```bash
pnpm prisma:migrate -- --name init
```

This package generates its Prisma client into `src/generated/prisma` so it does not collide with the legacy `backend` Prisma client.
