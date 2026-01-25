
### postgresql
로컬 접속 
psql -U postgres song_db

테이블 조회
SELECT tablename FROM pg_tables WHERE schemaname = 'public';


### prisma
cd backend

1. Prisma Client 생성
pnpx generate

2. 마이그레이션 실행 (테이블 생성)
pnpx prisma migrate dev

3. 개발서버 마이그레이션 실행 (sql 순차실행)
pnpx prisma migrate deploy

  ### 최근 아티스트 보기
SELECT channel_id FROM youtube_channel LIMIT 30 ;

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

## 타입 검증
pnpm --filter backend build

pnpm --filter frontend build

## prisma 생성
pnpm generate

pnpm --filter backend exec prisma generate

pnpm --filter admin exec prisma generate


동방신기 해외편 -> 687 東方神起


## 타입센스 인덱싱하기
source backend/.env && curl -X POST "https://backend-production-eaa8.up.railway.app/typesense/reindex" \
-H "Content-Type: application/json" \
-H "x-internal-token: $INTERNAL_API_TOKEN" \
-d '{"target":"all"}'