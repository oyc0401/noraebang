# Claude 작업 지침


# 코드스타일 규칙 (필수)
이 프로젝트는 2년이상 유지보수 해야하므로 대충 코드짜지 마세요
귀찮다고 작성한 잘못된 코드 하나가 나중에 무조건 몇배가 되어 본인과 다른사람들을 고통스럽게 합니다.

any타입 절대 금지.

null인데 ! 되도록 금지.

as 사용 되도록 자제.

foo: string | null; 보다는 foo?: string 이 좋아요
물론 prisma를 사용하면 string | null 이 나오는건 아는데, 그래도 최대한 foo?: string으로 해주세요.

외부 api를 가져와서 json을 파싱할때 as를 사용해서 타입 지정을 해주세요. (any가 나올 근원을 사전 제거)

함수뒤에 `foo() :Promise<UserData>` 처럼 타입선언을 해주는건 좋기는 한데, 어짜피 lint단에서 타입 추론이 가능하다면 되도록 타입선언 하지 말아주세요.


# 아키텍쳐 규칙 (필수)
단순 npx로 실행 가능한 스크립트코드에서는 prisma 생성이 가능하지만 그 이외의 서비스, Nest 프로젝트에서는 무조건 Repository를 사용하세요.

# 규칙
절대로 개발 서버를 실행하지 마세요
`pnpm dev` 등 금지

이 프로젝트는 무조건 pnpm을 사용합니다.


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

#### 크롤링 참고사항

- 노래방 번호가 `-`인 경우 해당 필드는 포함되지 않습니다
- 광고나 불필요한 행은 자동으로 필터링됩니다

# 기술스택

### 서버
nest.js

### 프론트
next.js
orval + tanstackquery
tailwind + cn()

### 포맷팅&문서
biome
apidoc
lineart

