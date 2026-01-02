# oyc0401 스타일 규칙 (NestJS / React / TypeScript)

## 0. 기본 원칙

* **경계(IO)에서 타입을 확정**하고, 내부로는 “깨끗한 타입”만 흘린다.
* 내부 도메인/서비스 레이어에는 **`null` 유입 금지(= `undefined`만 허용)**.
* 규칙을 깰 때는 **예외(Exceptions)에 케이스/이유/대체안**을 남긴다.

---

## 1. 타입 규칙 (공통)

### 1.1 금지: 모호한 타입

* ❌ `any`, `unknown`, `never` 사용 금지

try-catch에서는 이렇게 가능.
``` ts
catch (error) {
  console.error("❌ Fatal error:", error);
}
```

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

### 5.1 Controller 응답은 DTO **클래스** 사용 (API spec 생성 목적)

* ✅ **Controller에서 외부로 노출되는 응답**은 반드시 class DTO 사용
* ✅ `@ApiProperty()`로 무조건 Swagger 문서화 가능해야 함
* ✅ `Promise<XxxResponseDto>`로 반환 타입 명시
* ✅ Service 내부에서만 사용하는 타입은 **interface 사용** (API spec에 노출 안 됨)

**예시: Controller 응답 (class 필수)**
```ts
export class SongListResponseDto {
  @ApiProperty({ type: [SongDto] })
  data: SongDto[];
}

@Get()
async findAll(): Promise<SongListResponseDto> {
  return this.songsService.findAll();
}
```

### Controller에 노출되지 않는 타입은 무조건 DTO 사용하지 마세요. (interface 사용)
**Service 내부 타입 (interface 사용)**
```ts
// youtube.service.ts - 내부에서만 사용, API 응답 아님
export interface ChannelSearchResult {
  channelId: string;
  title: string;
}
```

### 5.2 제네릭 응답 래퍼는 Swagger에서 약하므로 "구체 DTO" 생성

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

---

## 8. Exceptions (예외)

* 금지 규칙을 깰 경우, 아래 형식으로 기록:

  * **규칙:** (예: `unknown` 금지)
  * **이유:** (왜 필요한지)
  * **범위:** (어느 파일/레이어까지 허용인지)
  * **대체안:** (장기적으로 제거할 방법)

---

원하시면 이 문서를 그대로 **`STYLEGUIDE.md` 형태로 저장하기 좋은 포맷**(링크 가능한 목차/체크리스트/PR 템플릿 포함)으로 한 번 더 다듬어드리겠습니다.
