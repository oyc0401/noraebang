# Claude 작업 지침

이 프로젝트는 2년이상 유지보수해야하므로 대충 코드짜지 마세요
any 금지.
null인데 ! 되도록 금지.
as 사용 되도록 자제.

## 개발 서버 실행 금지

- **절대로 개발 서버를 실행하지 마세요** (`pnpm dev`, `npm run dev`, `pnpm start:dev` 등)
- 서버 실행은 사용자가 직접 처리합니다
- API 테스트나 확인이 필요한 경우, 코드 작성만 하고 사용자에게 알려주세요

## 프로젝트 구조

- `frontend/`: Next.js 프론트엔드 (포트 3000)
  - API 호출은 모두 백엔드로 전달
  - `src/lib/api-client.ts`: API 클라이언트 유틸리티
  - `src/hooks/`: React Query hooks
- `backend/`: NestJS 백엔드 (포트 3001)
  - Repository Pattern 사용

## 패키지 관리자

- 이 프로젝트는 **pnpm**을 사용합니다
- npm이나 yarn 대신 항상 pnpm 명령어를 사용하세요

## PostgreSQL 데이터베이스

### 연결 정보

- **Host**: localhost
- **Port**: 5432
- **Database**: song_db
- **User**: postgres
- **Password**: postgres


### 데이터베이스 스키마

- **Artist**: 아티스트 정보
- **Song**: 곡 정보
- **ArtistSong**: 아티스트-곡 M:N 관계 (중간 테이블)
- **KaraokeSong**: 노래방 번호 (TJ, KY, JOYSOUND)

자세한 스키마는 `backend/prisma/schema.prisma` 참고

### Prisma 마이그레이션 베스트 프랙티스

**데이터 손실 가능성이 있는 스키마 변경 시 (컬럼 제거, 타입 변경, 테이블 구조 변경 등):**

1. **마이그레이션 파일만 생성 (적용 X)**
   ```bash
   cd backend
   npx prisma migrate dev --create-only
   ```

2. **생성된 `migration.sql` 파일 수동 편집**
   - 위치: `backend/prisma/migrations/[timestamp]_[name]/migration.sql`
   - 데이터 마이그레이션 SQL 추가 (INSERT, UPDATE 등)
   - 예시:
     ```sql
     -- 1. 새 테이블 생성
     CREATE TABLE "new_table" (...);

     -- 2. 기존 데이터 복사
     INSERT INTO "new_table" (col1, col2)
     SELECT old_col1, old_col2 FROM "old_table";

     -- 3. 기존 테이블/컬럼 제거
     ALTER TABLE "old_table" DROP COLUMN "old_col";
     ```

3. **개발 환경에서 테스트**
   ```bash
   # 백업
   pg_dump -h localhost -p 5432 -U postgres -d song_db -F c \
     -f backup_dev_$(date +%Y%m%d_%H%M%S).dump

   # 적용
   npx prisma migrate deploy

   # 검증 후 문제 있으면 복구
   psql -h localhost -p 5432 -U postgres -c "DROP DATABASE song_db;"
   psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE song_db;"
   pg_restore -h localhost -p 5432 -U postgres -d song_db backup_dev_*.dump
   ```

4. **프로덕션 배포**
   ```bash
   # 1. 백업 (필수!)
   pg_dump -h <host> -p <port> -U <user> -d <database> -F c \
     -f backup_production_$(date +%Y%m%d_%H%M%S).dump

   # 2. 마이그레이션 적용 (이것만!)
   npx prisma migrate deploy
   ```

**중요:**
- `migration.sql` 파일 하나에 여러 SQL 문 작성 가능
- 모든 SQL은 트랜잭션으로 실행됨 (실패 시 자동 롤백)
- 절대로 수동 SQL 실행이나 별도 스크립트 실행 없이 `npx prisma migrate deploy` 한 번으로 완료되도록 작성

## NestJS Backend API

백엔드는 NestJS로 구현되어 있으며, 모든 API는 `http://localhost:3001`에서 제공됩니다.

### 아키텍처

- **Controller**: HTTP 요청/응답 처리
- **Service**: 비즈니스 로직
- **Repository Pattern**: 데이터 액세스 추상화
  - `ArtistRepository`, `SongRepository` 인터페이스
  - `ArtistMemoryRepository`, `SongMemoryRepository` 구현체 (메모리 DB 사용)
  - 나중에 실제 DB 레포지토리로 교체 가능

### 데이터 소스

## 환경 변수

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend (`backend/.env`)
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/song_db?schema=public"
PORT=3001
```

#### 크롤링 참고사항

- 노래방 번호가 `-`인 경우 해당 필드는 포함되지 않습니다
- 광고나 불필요한 행은 자동으로 필터링됩니다


ㅇ