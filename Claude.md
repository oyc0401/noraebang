# 0. 프로젝트 운영 원칙 (공통)

## 0.1 Claude 작업 지침

* 이 프로젝트는 2년 이상 유지보수 대상이므로 대충 코드 작성 금지
* 귀찮아서 만든 잘못된 코드 1개가 나중에 여러 배로 비용 증가
* **API 엔드포인트를 임의로 생성/제거 금지**
* **API 엔드포인트 수정 시 팀원 혼란 유발 → 사전 합의 없는 엔드포인트 변경은 오류로 간주**

## 0.2 공통 금지 사항 / 실행 규칙

* **절대로 개발 서버 실행 금지** (`pnpm dev` 등 금지)
* **패키지 매니저는 pnpm 고정**
* **코드 포맷팅/타입 체크 명령 실행 금지** (`pnpm biome`, `pnpm tsc --noEmit` 등 금지 - VSCode에서 자동 처리)

---

# 1. TypeScript 공통 규칙 (TS 공통)

## 1.1 기본 원칙

* **경계(IO)에서 타입 확정** → 내부에는 “깨끗한 타입”만 전달
* 내부 도메인/서비스 레이어에 **`null` 유입 금지 (`undefined`만 허용)**
* 규칙을 깨면 **Exceptions 섹션에 케이스/이유/대체안 기록**

## 1.2 타입 금지 규칙

### 1.2.1 모호한 타입 금지

* ❌ `any`, `unknown`, `never` 금지
* ✅ 예외: **IO 경계에서만** `unknown`을 “즉시 Zod parse” 목적일 때 허용

### 1.2.2 Non-null assertion 금지

* ❌ `foo!.bar` 금지

### 1.2.3 `| null` 금지 (내부 기준)

* ❌ `foo: string | null` 금지
* ✅ `foo?: string` 사용
* ✅ DB/외부 `null`은 **반드시 `undefined`로 변환 후** 내부로 전달

**예시 (Prisma null → undefined)**

```ts
async findAll(): Promise<SongDto[]> {
  const songs = await this.prisma.song.findMany({
    select: { id: true, title: true, titleKo: true }, // titleKo: string | null
  });

  return songs.map((song) => ({
    id: song.id,
    title: song.title,
    titleKo: song.titleKo ?? undefined,
  }));
}
```

### 1.2.4 `as` 최소화

* ❌ 내부 로직에서 `as` 남발 금지
* ✅ 불가피하면 **IO 경계에서 1회만** 허용 (가능하면 Zod로 대체)

## 1.3 IO 경계 규칙

### 1.3.1 외부 데이터는 “파싱 직후 Zod 검증”

* 외부 JSON은 타입이 아니라 데이터 → **Zod `parse`로 확정 후** 내부로 전달

**예시 (외부 API fetch + Zod parse)**

```ts
import { z } from "zod";

const OembedSchema = z.object({
  title: z.string(),
  author_name: z.string().optional(),
});

type Oembed = z.infer<typeof OembedSchema>;

export async function fetchOembed(url: string): Promise<Oembed> {
  const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
  const json: unknown = await res.json(); // IO 경계에서만 unknown 예외 허용
  return OembedSchema.parse(json);        // 런타임 검증 + 타입 확정
}
```

## 1.4 타입 선언(명시) 규칙

### 1.4.1 추론 가능하면 생략

```ts
foo() {
  return { foo: "a", bar: "b" };
}
```

### 1.4.2 Controller로 넘어가는 Service 메서드는 반환 타입 명시

```ts
async findAll(): Promise<SongDto[]> {
  // ...
}
```

## 1.5 Exceptions (예외 기록 규격)

* 금지 규칙을 깰 경우 아래 형식으로 기록

  * **규칙:**
  * **이유:**
  * **범위:**
  * **대체안:**

---

# 2. NestJS 규칙 (백엔드)

## 2.1 NestJS Backend API 기본

* 백엔드는 NestJS
* API Base: `http://localhost:3001`

## 2.2 컨트롤러 규칙

### 2.2.1 모든 컨트롤러 메서드는 반환 타입 무조건 명시

```ts
// ✅
async getYoutubeOembed(@Query("url") url: string): Promise<YoutubeOembedResponseDto> {
  return this.youtubeService.getOembedData(url);
}

// ❌
async getYoutubeOembed(@Query("url") url: string) {
  return this.youtubeService.getOembedData(url);
}
```

### 2.2.2 컨트롤러는 얇게 유지

* ✅ 입력 받기 / 검증 트리거 / 서비스 호출 / DTO 반환만
* ❌ 비즈니스 로직/대량 매핑/예외 처리 난무 금지

## 2.3 응답 / DTO / Swagger 규칙

### 2.3.1 모든 API 응답은 DTO “class” 사용 (interface 금지)

* `@ApiProperty()`로 문서화 가능해야 함
* `Promise<XxxResponseDto>`로 반환 타입 명시
* Service 반환 타입도 DTO(class)로 통일

### 2.3.2 제네릭 래퍼 대신 “구체 DTO” 생성

* `ApiResponse<T>` 그대로 노출 금지 → `XxxResponseDto` 생성

### 2.3.3 DTO는 `@ApiProperty()`로 Swagger 문서화

```ts
export class OembedDataDto {
  @ApiProperty({ example: "YOASOBI - 夜に駆ける" })
  title: string;

  @ApiProperty({ required: false, example: "채널명" })
  authorName?: string;
}
```

## 2.4 에러/예외 규칙

* ✅ 예외 처리 방식 통일 (`HttpException` 또는 공통 Exception Filter)
* ❌ 컨트롤러마다 try-catch 포장 금지
* ✅ 외부 API 실패/검증 실패는 의미 있는 HTTP 코드로 변환

## 2.5 아키텍처 규칙 (필수)

### 2.5.1 스크립트 위치/실행 규칙

* 스크립트는 `admin/src/scripts/` 폴더에 작성 (admin/scripts 아님)
* `admin/src/scripts/` 내 pnpm ts-node 스크립트는 Prisma Client 직접 생성 가능
* 새 스크립트 작성 시 반드시 기존 스크립트 참고

**Prisma 사용 패턴**

```ts
import "dotenv/config";  // 반드시 최상단에!
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // 로직
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();  // pool도 닫아야 함!
  });
```

### 2.5.2 데이터 손실 가능 마이그레이션 절차

(컬럼 제거/타입 변경/테이블 구조 변경 등)

1. **마이그레이션 파일만 생성 (적용 X)**

```bash
cd backend
npx prisma migrate dev --create-only
```

2. **migration.sql 수동 편집**

* 위치: `backend/prisma/migrations/[timestamp]_[name]/migration.sql`
* 데이터 마이그레이션 SQL 추가 (INSERT/UPDATE 등)

3. **개발 환경 테스트**

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

**중요**

* `migration.sql` 한 파일에 여러 SQL 문 작성 가능
* 모든 SQL은 트랜잭션으로 실행(실패 시 롤백)
* 수동 SQL 실행 없이 `npx prisma migrate deploy` 1회로 완료되게 작성

---

# 3. Next.js 규칙 (프론트)

## 3.1 React/프론트 공통 규칙

### 3.1.1 상태 관리: Zustand

* 상태 관리는 Zustand로 통일
* 전역 상태는 “진짜 전역이어야 하는 것만”
* 모든 것을 전역 store에 넣기 금지

### 3.1.2 폼: React Hook Form + Zod

* 폼: React Hook Form
* 검증/스키마: Zod
* 입력 타입은 `z.infer<typeof Schema>`로 고정

### 3.1.3 내부 API fetch: Orval 강제

* 내부 API 호출은 **무조건 Orval**
* 내부 API에 `fetch` 직접 사용 금지
* `fetch`는 외부 API에서만 허용 + IO 경계 Zod parse 적용(1.3)

### 3.1.4 Tailwind + cn() 규칙

* Tailwind 사용
* 클래스 합치기/조건 분기: 무조건 `cn()`
* 템플릿 리터럴 조합 금지

```tsx
<div className={cn(
  "px-3 py-2 rounded-md",
  isActive && "font-semibold",
  disabled ? "opacity-50 pointer-events-none" : "hover:bg-muted"
)} />
```

### 3.1.5 다이얼로그 패턴

* 다이얼로그는 **props 없이** 사용: `<SongEditDialog />`
* open 여부는 **Zustand store에서 관리**
* ❌ props로 open/onClose 전달 금지

```tsx
// ✅ 올바른 사용
<SongEditDialog />

// ❌ 금지
<SongEditDialog open={isOpen} onClose={handleClose} song={song} />
```

### 3.1.6 Store & Custom Hook 분리

* store가 비대해지지 않게 **커스텀 훅으로 로직 분리**
* store는 **상태만** 보관, 복잡한 로직은 **훅에서 처리**

### 3.1.7 인증: Orval 단에서 통합 관리

* 인증 로직(토큰 갱신, 헤더 주입 등)은 **Orval custom instance에서 처리**
* 컴포넌트/훅에서 인증 관련 코드 직접 작성 금지
* ❌ 개별 API 호출마다 토큰 처리 금지

## 3.2 디자인 규칙

* 아이콘: lucide 사용
* 이미지: **무조건 `next/image`**
* 정적 이미지(SVG 등): **import 후 `src={Icon}` 형태로 사용**
* 클릭 이벤트: **무조건 `<button type="button">` 사용**
* 클릭 가능 요소: **무조건 `cursor-pointer` 적용**

```tsx
// 정적 이미지 사용법
import SpotifyIcon from "@/icons/spotify-filled.svg";

<Image src={SpotifyIcon} alt="Spotify" width={44} height={44} />

// 버튼
<button type="button" className="cursor-pointer">
```

## 3.3 기술스택 (프론트 고정)

* next.js
* Tanstack Query + Orval (OpenAPI 기반 hook 생성)
* tailwind + cn()
* Zustand
* React-hook-form + Zod

---

# 4. 포맷팅 & 문서화 (공통)

## 4.1 Biome (포맷팅 & 린팅)

* **VSCode 익스텐션 설치 필수**: `biomejs.biome`
* 각 프로젝트 루트에 `biome.json` 설정 파일 사용
* 저장 시 자동 포맷팅 권장

## 4.2 API 문서화: apidoc

* API 문서 관리는 **apidoc** 사용

## 4.3 작업/일정 관리: Linear

* 작업 및 일정 관리는 **Linear** 사용

---
