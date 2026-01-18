# admin/src/lib/admin 함수 작성 규칙

이 폴더는 `admin/src/scripts/` 스크립트들의 핵심 로직을 재사용 가능한 함수로 분리한 곳입니다.
어드민 사이트(서버 액션)에서 직접 호출할 수 있습니다.

## 필수 규칙

### 1. 함수 시그니처
```ts
export async function functionName(
  requiredArg: Type,
  options: FunctionNameOptions = {},
): Promise<FunctionNameResult> {
```

- 첫 번째 인자: 필수 파라미터 (artistId, songId 등)
- 두 번째 인자: options 객체 (기본값 `{}`)

### 2. Options 타입 필수 포함
```ts
export interface FunctionNameOptions {
  dryRun?: boolean;   // true면 DB 변경 없이 결과만 반환
}
```

### 3. Result 타입 대신 콘솔 출력
- 모든 함수는 `Promise<void>`를 반환하고, 필요한 정보는 `console.log`로 출력합니다.
- 통계는 return 값 대신 로그로 남깁니다.

### 4. 콘솔 로깅
- 함수 내부에서는 별도 토글 없이 항상 `console.log`로 진행 상황을 출력하세요.

### 5. Prisma 사용
```ts
import { prisma } from "../prisma";
```
- `../prisma`에서 싱글톤 인스턴스 사용
- 스크립트처럼 직접 Pool/Adapter 생성하지 않음

### 6. 에러 처리
- 유효하지 않은 ID는 throw
- 개별 아이템 실패는 stats.failed에 카운트
- 전체 실패만 throw

```ts
if (!entity) {
  throw new Error(`Entity not found: ${id}`);
}
```

## 파일 네이밍
- 케밥 케이스: `map-propose-song.ts`
- 함수명은 카멜 케이스: `mapProposeSong`

## 사용 예시
```ts
// 어드민 서버 액션에서
import { mapProposeSong } from "@/lib/admin/map-propose-song";

// 실제 실행
await mapProposeSong(artistId);

// dry run
await mapProposeSong(artistId, { dryRun: true });
```


## 각각의 파일 맨 위, 임포트 아래에 제발 뭐하는 함수인지 꼭 적으세요
## 각각의 파일 맨 위, 임포트 아래에 제발 뭐하는 함수인지 꼭 적으세요
## 각각의 파일 맨 위, 임포트 아래에 제발 뭐하는 함수인지 꼭 적으세요
