# Auth 모듈 설계 노트

## 목표와 철학
- **익명 사용자 우선**: 로그인 없이도 개인화된 추천/히스토리를 위해, 최초 접근 시 곧바로 익명 계정을 생성하고 토큰을 발급한다.
- **웹·모바일 엔드포인트 분리**: 웹은 HttpOnly 쿠키로만 인증하고, 앱은 `/auth/mobile/**` 전용 라우트에서 JSON 응답으로 토큰을 받는다. 동일 서버에서 동작하지만 쿠키/본문이 섞이지 않도록 방지한다.
- **리프레시 토큰 해시 저장**: DB에는 HMAC-SHA256(pepper)으로 해시한 refresh 토큰만 남겨 탈취 시에도 재사용을 어렵게 한다.
- **모바일 세션 단순화**: 앱 사용자는 최초 익명 로그인 후 refresh(180일)를 유지하면 되며, 토큰 만료 시 새 계정을 생성한다. deviceSecret·nonce 없이 동작해 구현을 단순화했다.
- **자동 회복**: 프런트는 401 및 장기 미사용 시 익명 로그인/리프레시 과정을 자동으로 반복해 사용자가 페이지를 새로고침하지 않아도 세션이 유지되도록 한다.

## 핵심 구성 요소

### AuthController (`backend/src/auth/auth.controller.ts`)
- `/auth/anonymous`: 웹 익명 로그인. 새 `user` 레코드 생성 → access/refresh 토큰 발급 → HttpOnly 쿠키에 저장.
- `/auth/refresh`: 웹 전용. Refresh 쿠키로만 새 토큰을 발급하며, `WEB_ORIGIN`과 일치하는 Origin/Referer를 반드시 요구한다.
- `/auth/profile`: `JwtAuthGuard`로 보호된 현재 사용자 프로필 조회.
- `/auth/logout`: refresh 토큰 무효화 및 쿠키 삭제.

### MobileAuthController (`backend/src/auth/mobile-auth.controller.ts`)
- `/auth/mobile/anonymous`: 앱 익명 로그인. 요청 시마다 새 익명 사용자를 생성하고 토큰을 발급한다.
- `/auth/mobile/refresh`: 앱 전용. 요청 본문에 담긴 refresh 토큰으로 새 JWT를 반환한다.
- `/auth/mobile/profile`: 모바일에서 동일한 `JwtAuthGuard`를 통해 프로필 조회. Authorization 헤더로 access 토큰을 보낸다.
- `/auth/mobile/logout`: DB상의 refresh 토큰을 제거하고 `{ success: true }`를 반환. 쿠키 클리어는 하지 않는다.

### AuthService (`backend/src/auth/auth.service.ts`)
- `anonymousLogin()`: 빈 사용자 생성 후 `createSessionAndTokens`로 세션을 만든다.
- `anonymousMobileLogin()`: 단순히 새 익명 사용자를 생성하고, 모바일 전용 refresh TTL(180일)로 토큰을 발급한다. refresh 토큰이 만료되면 해당 계정은 다시 접근할 수 없다.
- `refreshTokens()`: refresh 토큰 검증 → 세션 조회 → 해시 비교 → 같은 세션 ID로 토큰 롤링(`rotateSessionTokens`). 불일치/재사용이 감지되면 해당 세션을 즉시 폐기한다. 세션 만료 시각(`refreshTokenExpiresAt`)은 항상 채워진다.
- `getProfile()`: 사용자 존재 여부 확인 후 기본 정보 반환.
- `logout()`: 세션 ID가 있으면 해당 세션만 삭제, 없으면 전체 세션 삭제.
- 내부 유틸: `generateTokens`, `storeSession`, `hashRefreshToken`.

### 토큰 전략과 가드
- `JwtStrategy`: access 토큰만 허용(`payload.type === "access"`). 우선 쿠키에서 토큰을 찾고 없으면 Authorization 헤더를 사용한다.
- Access/refresh JWT에는 `sessionId`를 함께 실어 보내고, 가드는 `CurrentUser`에 이를 주입한다. `sessionId`가 없는 토큰은 더 이상 허용하지 않는다.
- `JwtAuthGuard`: 기본 보호용.
- `OptionalJwtAuthGuard`: 로그인 여부에 따라 선택적으로 정보를 제공할 때 사용 가능하도록 준비.

### Prisma 스키마 (`backend/prisma/schema.prisma`)
```prisma
model User {
  id          Int      @id @default(autoincrement())
  email       String?  @unique
  password    String?
  lastLoginAt DateTime @default(now())
  ...

  sessions UserSession[]
}

model UserSession {
  id                     String   @id
  userId                 Int      @map("user_id")
  refreshTokenHash       String   @map("refresh_token_hash")
  refreshTokenLastUsedAt DateTime? @map("refresh_token_last_used_at")
  refreshTokenExpiresAt  DateTime @map("refresh_token_expires_at")
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```
- 한 사용자당 여러 세션(`UserSession`)을 가질 수 있어, 폰/PC/브라우저 프로필마다 독립적으로 refresh 토큰을 유지한다.
- 기존 `refresh_token` 컬럼은 `user_session` 테이블로 이전해서 확장성을 확보했다.

## 프런트엔드 연동 흐름

### AuthProvider (`frontend/src/providers/AuthProvider.tsx`)
1. 마운트 시 `/auth/profile` 호출.
2. 401이면 `/auth/anonymous` → 다시 profile을 획득.
3. 로그아웃 등으로 `isAuthenticated`가 false가 되면 동일 루틴을 재시도.

### customFetch (`frontend/src/api/client.ts`)
- 요청이 401이면 즉시 `attemptRefresh()`를 실행해 토큰 재발급 후 한 번 더 시도한다.
- 슬라이딩 만료는 서버의 `UserSession.refreshTokenLastUsedAt/ExpiresAt`로 관리해, 클라이언트 로컬 시계/스토리지에 의존하지 않는다.

## 왜 이렇게 했나?
- **웹/모바일 경로 분리**: `x-client-type` 헤더로 분기하던 구조보다 명시적인 라우팅이 안전하고, 정책이 달라도 구현을 재사용할 수 있다.
- **쿠키 기반**: 클라 코드에서 토큰을 다루지 않아도 되어 보안이 단순해진다. 서버 렌더링(next)과도 자연스럽게 동작.
- **익명 사용자 분리**: 검색 히스토리, 즐겨찾기 등 향후 기능을 위해 익명 사용자도 고유 ID를 가지게 했다.
- **모바일 세션 단순화**: deviceSecret/nonce를 없애고, 앱은 익명 로그인 한 번으로 refresh(180일)만 유지하면 된다. refresh 만료 또는 분실 시 기존 계정은 접근할 수 없다.
- **서버 주도 슬라이딩 만료**: 각 `UserSession`에 `refreshTokenLastUsedAt/ExpiresAt`을 저장하고 갱신해 쿠키/토큰 수명을 연장하므로, 사용자의 로컬 환경이나 다른 세션과 독립적으로 관리된다.
- **다중 기기 세션 유지**: 세션 ID(UUID v4)를 refresh 토큰에 포함시켜 기기별로 독립적인 로그인 상태를 유지하고, 한 기기에서 로그아웃/탈취가 발생해도 다른 기기에 영향을 주지 않는다.
- **웹 쿠키 최소 권한**: access 토큰은 `/` 경로, refresh 토큰은 `/auth/refresh` 경로로만 전송해, 불필요한 엔드포인트에 refresh 쿠키가 노출되지 않도록 했다.
- **Origin 기반 CSRF 방어**: `/auth/refresh`, `/auth/logout` 등 상태 변경 요청은 `WEB_ORIGIN`과 일치하는 Origin/Referer 헤더가 있어야 통과한다.
- **Refresh 로테이션 및 재사용 탐지**: refresh 호출 시마다 새 토큰을 발급하고 DB 해시를 교체한다. 이전 토큰이 다시 제출되면 매칭되는 세션을 즉시 폐기해 탈취 시도를 차단한다.
- **Refresh 해시 보호**: `REFRESH_TOKEN_PEPPER` 기반 HMAC-SHA256으로 refresh 토큰을 해시하여 DB만 탈취되더라도 원문을 알아내기 어렵게 한다.
- **익명 유저 청소 전략**: `/auth/anonymous`, `/auth/mobile/anonymous`에는 필수적으로 rate limit을 걸고, `lastLoginAt`/세션 만료 기준으로 장기간 미사용 익명 계정을 주기적으로 정리한다.
- **자동 복구**: 사용자가 로그아웃 또는 토큰 만료로 보호된 API 호출이 실패하더라도, 프런트가 즉시 익명 로그인 또는 refresh 로직을 재시도해 UX를 끊김 없이 유지한다.
