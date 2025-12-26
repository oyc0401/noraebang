
### postgresql
로컬 접속 psql -U postgres song_db

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


### 로컬 db 주소
postgresql://postgres:postgres@localhost:5432/song_db?schema=public

### 개발 덤프 만들기
PGPASSWORD=postgres pg_dump -h localhost -p 5432 -U postgres -d song_db \
  --schema=public \
  --no-owner --no-acl \
  -Fc -f song_public.dump

### 덤프를 supabase에 업로드
  pg_restore --dbname "postgresql://postgres.mmcqhftzxmdvnwmubqab:noraebang1234%21%40%23%24@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres" \
  --clean --if-exists --no-owner --no-acl \
  song_public.dump

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
