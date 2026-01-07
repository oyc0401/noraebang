# Claude 작업 지침

이 프로젝트는 2년이상 유지보수 해야하므로 대충 코드짜지 마세요
귀찮다고 작성한 잘못된 코드 하나가 나중에 무조건 몇배가 되어 본인과 다른사람들을 고통스럽게 합니다.

api엔드포인트를 맘대로 생성/제거하지 마세요.
api엔드포인트를 수정하면 팀원들에게 혼란을 주고, 상의되지 않는 엔드포인트자체가 오류입니다.


# oyc0401 스타일 규칙 (NestJS / React / TypeScript)

## 0. 기본 원칙

* **경계(IO)에서 타입을 확정**하고, 내부로는 “깨끗한 타입”만 흘린다.
* 내부 도메인/서비스 레이어에는 **`null` 유입 금지(= `undefined`만 허용)**.
* 규칙을 깰 때는 **예외(Exceptions)에 케이스/이유/대체안**을 남긴다.

---

## 1. 타입 규칙 (공통)

### 1.1 금지: 모호한 타입

* ❌ `any`, `unknown`, `never` 사용 금지
* ✅ 예외: **IO 경계에서만** `unknown`을 “즉시 Zod parse” 목적일 때 허용(2.1)

### 1.2 금지: Non-null assertion

* ❌ `foo!.bar` 금지

### 1.3 금지: `| null`

* ❌ `foo: string | null` 금지
* ✅ `foo?: string` 사용
* ✅ DB/외부에서 `null`이 오면 반드시 `undefined`로 변환해서 내부로 넘긴다.

**예시 (Prisma null → undefined 변환)**

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

### 1.4 `as` 사용 최소화

* ❌ 내부 로직에서 `as` 남발 금지
* ✅ 불가피하면 **IO 경계에서 1회만** 허용 (가능하면 Zod로 대체)

---

## 2. IO 경계 규칙

### 2.1 외부 데이터는 “파싱 직후 Zod 검증”이 기본

* 외부 JSON은 타입이 아니라 데이터이므로 **`parse`로 확정**하고 내부로 들인다.

**예시 (외부 API: fetch 허용 + Zod로 타입 확정)**

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

---

## 3. 타입 선언(명시) 규칙

### 3.1 의도적인 타입 선언 자제 (추론 가능하면 생략)

```ts
foo() {
  return { foo: "a", bar: "b" };
}
```

### 3.2 단, Controller로 “넘어가는” Service 메서드는 반환 타입 명시

```ts
async findAll(): Promise<SongDto[]> {
  // ...
}
```

---

## 4. NestJS 컨트롤러 규칙

### 4.1 모든 컨트롤러 메서드는 반환 타입 무조건 명시

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

### 4.2 컨트롤러는 얇게 유지

* ✅ 입력 받기 / 검증 트리거 / 서비스 호출 / DTO 반환만
* ❌ 비즈니스 로직/대량 매핑/예외 처리 난무 금지

---

## 5. NestJS 응답/DTO/Swagger 규칙

### 5.1 모든 API 응답은 DTO **클래스** 사용 (interface 금지)

* ✅ `@ApiProperty()`로 문서화 가능해야 함
* ✅ `Promise<XxxResponseDto>`로 반환 타입 명시
* ✅ Service에서 반환하는 타입도 DTO(class)로 통일

### 5.2 제네릭 응답 래퍼는 Swagger에서 약하므로 “구체 DTO” 생성

* ✅ `ApiResponse<T>`를 그대로 노출하지 말고 `XxxResponseDto`를 만든다.

### 5.3 DTO는 `@ApiProperty()`로 Swagger 문서화

```ts
export class OembedDataDto {
  @ApiProperty({ example: "YOASOBI - 夜に駆ける" })
  title: string;

  @ApiProperty({ required: false, example: "채널명" })
  authorName?: string;
}
```

---

## 6. NestJS 에러/예외 규칙

* ✅ 예외 처리 방식 통일 (`HttpException` 또는 공통 Exception Filter)
* ❌ 컨트롤러마다 제각각 try-catch 포장 금지
* ✅ 외부 API 실패/검증 실패는 의미 있는 HTTP 코드로 변환

---

## 7. React 규칙

### 7.1 상태 관리: Zustand

* ✅ 상태 관리는 **Zustand로 통일**
* ✅ 전역 상태는 “진짜 전역이어야 하는 것만”
* ❌ 모든 것을 전역 store에 넣기 금지

### 7.2 폼: React Hook Form + Zod

* ✅ 폼은 **React Hook Form**
* ✅ 검증/스키마는 **Zod**
* ✅ 폼 입력 타입은 `z.infer<typeof Schema>`로 고정

### 7.3 내부 API fetch: Orval 강제

* ✅ 내부 데이터 fetch는 **무조건 Orval**
* ❌ `fetch` 직접 사용 금지 (내부 API 호출에 한함)
* ✅ `fetch`는 **외부 API 호출**에서만 허용하고, 이때는 2.1 규칙(Zod parse) 적용

### 7.4 Tailwind + cn() 규칙

* ✅ Tailwind 사용
* ✅ 클래스 합치기/조건 분기는 **무조건 `cn()` 사용**
* ❌ 템플릿 리터럴로 className 조합 금지

**예시 (cn 사용)**

```tsx
<div className={cn(
  "px-3 py-2 rounded-md",
  isActive && "font-semibold",
  disabled ? "opacity-50 pointer-events-none" : "hover:bg-muted"
)} />
```


## 8. Exceptions (예외)

* 금지 규칙을 깰 경우, 아래 형식으로 기록:

  * **규칙:** (예: `unknown` 금지)
  * **이유:** (왜 필요한지)
  * **범위:** (어느 파일/레이어까지 허용인지)
  * **대체안:** (장기적으로 제거할 방법)


# 아키텍쳐 규칙 (필수)

**스크립트:**
- `admin/scripts/` 내 npx로 실행 가능한 스크립트에서는 Prisma Client를 직접 생성 가능합니다

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


# 디자인 규칙

- 아이콘: lucide 사용

사진 넣을때 무조건 Next/image 쓰고,
svg라면 무조건 임포트해서, src={Icon} 으로 사용하세요.

클릭 이벤트 만들때 무조건 button 태그 쓰고 타입까지 넣으세요.
``` tsx
          <button
            type="button"
```



# 기술스택

### 서버
nest.js

### 프론트
- next.js
- Tanstack Query + Orval (OpenAPI 기반으로 hook 생성)
- tailwind + cn()
- Zustand
- React-hook-form + Zod



### 포맷팅&문서
- biome
- apidoc
- lineart

