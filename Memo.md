
### postgresql
로컬 접속 psql -U postgres song_db

테이블 조회
SELECT tablename FROM pg_tables WHERE schemaname = 'public';


### prisma
cd backend

1. Prisma Client 생성
pnpm prisma:generate

2. 마이그레이션 실행 (테이블 생성)
pnpm prisma:migrate


