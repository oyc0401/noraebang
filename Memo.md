
### postgresql
로컬 접속 
psql -U postgres song_db

테이블 조회
SELECT tablename FROM pg_tables WHERE schemaname = 'public';


### prisma
cd backend

1. Prisma Client 생성
pnpx generate"

2. 마이그레이션 실행 (테이블 생성)
pnpx prisma migrate dev

3. 개발서버 마이그레이션 실행 (sql 순차실행)
pnpx prisma migrate deploy

  ### 최근 아티스트 보기
   SELECT id, name, alias, created_at
  FROM artist
  ORDER BY created_at DESC
  LIMIT 30;

  ## 최근 곡 보기
SELECT s.id, s.title, a.name as artist_name, s.created_at
  FROM song s
  JOIN artist a ON s.artist_id = a.id
  ORDER BY s.created_at DESC
  LIMIT 30;


## orval 생성
pnpm --filter frontend codegen

## api-spec.json 생성
pnpm ts-node download-api-json.ts

pnpm --filter backend build

pnpm --filter frontend build

pnpm --filter admin exec prisma generate