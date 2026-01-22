# Auth 모듈 설계 노트

## 목표와 철학
- **익명 사용자 우선**: 로그인 없이도 개인화된 추천/히스토리를 위해, 최초 접근 시 곧바로 익명 계정을 생성하고 토큰을 발급한다.
- **웹·모바일 엔드포인트 분리**: 웹은 HttpOnly 쿠키로만 인증하고, 앱은 `/auth/mobile/**` 전용 라우트에서 JSON 응답으로 토큰을 받는다. 동일 서버에서 동작하지만 쿠키/본문이 섞이지 않도록 방지한다.
- **리프레시 토큰 해시 저장**: DB에는 bcrypt로 해시한 refresh 토큰만 남겨 탈취 시에도 재사용을 어렵게 한다.
- **기기 신뢰도 보강**: 앱은 `deviceSecret` 기반 HMAC 서명을 사용해 재발급 요청을 검증한다. 최초 1회만 시크릿을 내려주고 이후에는 서명 검증으로만 신뢰한다.
- **자동 회복**: 프런트는 401 및 장기 미사용 시 익명 로그인/리프레시 과정을 자동으로 반복해 사용자가 페이지를 새로고침하지 않아도 세션이 유지되도록 한다.

## 핵심 구성 요소

### AuthController (`backend/src/auth/auth.controller.ts`)
- `/auth/anonymous`: 웹 익명 로그인. 새 `user` 레코드 생성 → access/refresh 토큰 발급 → HttpOnly 쿠키에 저장.
- `/auth/refresh`: 쿠키 또는 요청 바디에서 refresh 토큰을 읽어 새 토큰 발급. 실패 시 `401 Unauthorized`.
- `/auth/profile`: `JwtAuthGuard`로 보호된 현재 사용자 프로필 조회.
- `/auth/logout`: refresh 토큰 무효화 및 쿠키 삭제.

### MobileAuthController (`backend/src/auth/mobile-auth.controller.ts`)
- `/auth/mobile/anonymous`: 앱 익명 로그인. `deviceId` 필수, 신규 기기면 `deviceSecret` 생성 후 함께 반환. 기존 기기는 `nonce`와 `signature=HMAC(deviceSecret, nonce)`를 검증해야 한다.
- `/auth/mobile/refresh`: 앱에서 전달한 refresh 토큰으로 새 JWT를 본문으로 반환.
- `/auth/mobile/profile`: 모바일에서 동일한 `JwtAuthGuard`를 통해 프로필 조회. Authorization 헤더로 access 토큰을 보낸다.
- `/auth/mobile/logout`: DB상의 refresh 토큰을 제거하고 `{ success: true }`를 반환. 쿠키 클리어는 하지 않는다.

### AuthService (`backend/src/auth/auth.service.ts`)
- `anonymousLogin()`: 빈 사용자 생성 후 `generateAndStoreTokens`.
- `anonymousMobileLogin()`: `deviceId` 기반으로 기존 사용자 조회. 서명 검증 성공 시 토큰만 재발급, 아니면 새 유저 + `deviceSecret` 생성.
- `refreshTokens()`: refresh 토큰 검증 → 해시 비교 → 새 access/refresh 토큰 발급.
- `getProfile()`: 사용자 존재 여부 확인 후 기본 정보 반환.
- `logout()`: DB에 저장된 refresh 토큰 해시 제거.
- 내부 유틸: `generateTokens`, `storeRefreshToken`, `generateDeviceSecret`, `verifyDeviceSignature`.

### 토큰 전략과 가드
- `JwtStrategy`: access 토큰만 허용(`payload.type === "access"`). 우선 쿠키에서 토큰을 찾고 없으면 Authorization 헤더를 사용.
- `JwtAuthGuard`: 기본 보호용.
- `OptionalJwtAuthGuard`: 로그인 여부에 따라 선택적으로 정보를 제공할 때 사용 가능하도록 준비.

### Prisma 스키마 (`backend/prisma/schema.prisma`)
```prisma
model User {
  id           Int      @id @default(autoincrement())
  email        String?  @unique
  password     String?
  deviceId     String?  @unique @map("device_id")
  deviceSecret String?  @map("device_secret")
  refreshToken String?  @map("refresh_token")
  refreshTokenLastUsedAt DateTime? @map("refresh_token_last_used_at")
  refreshTokenExpiresAt  DateTime? @map("refresh_token_expires_at")
  lastLoginAt  DateTime @default(now())
  ...
}
```
- 모든 익명/앱 로그인은 `User` 테이블을 공용으로 사용한다. 이메일 계정이 생기면 해당 필드가 채워지는 방식.

## 프런트엔드 연동 흐름

### AuthProvider (`frontend/src/providers/AuthProvider.tsx`)
1. 마운트 시 `/auth/profile` 호출.
2. 401이면 `/auth/anonymous` → 다시 profile을 획득.
3. 로그아웃 등으로 `isAuthenticated`가 false가 되면 동일 루틴을 재시도.

### customFetch (`frontend/src/api/client.ts`)
- 요청이 401이면 즉시 `attemptRefresh()`를 실행해 토큰 재발급 후 한 번 더 시도한다.
- 명시적인 슬라이딩 연장은 서버가 `refreshTokenLastUsedAt/ExpiresAt`으로 관리하므로, 클라이언트 로컬 시계/스토리지에 의존하지 않는다.

## 왜 이렇게 했나?
- **웹/모바일 경로 분리**: `x-client-type` 헤더로 분기하던 구조보다 명시적인 라우팅이 안전하고, 정책이 달라도 구현을 재사용할 수 있다.
- **쿠키 기반**: 클라 코드에서 토큰을 다루지 않아도 되어 보안이 단순해진다. 서버 렌더링(next)과도 자연스럽게 동작.
- **익명 사용자 분리**: 검색 히스토리, 즐겨찾기 등 향후 기능을 위해 익명 사용자도 고유 ID를 가지게 했다.
- **모바일 기기 서명**: 단순 `deviceId`만으로는 탈취 위험이 있으므로, 한 번 발급된 `deviceSecret`을 사용해 HMAC 서명을 강제했다. 재설치 등 edge case는 `deviceSecret` 백업을 전제로 한다.
- **서버 주도 슬라이딩 만료**: `refreshTokenLastUsedAt`과 `refreshTokenExpiresAt`을 서버에서 갱신하면서 쿠키/토큰의 수명을 연장하므로, 사용자의 로컬 시계나 스토리지에 의존하지 않는다.
- **자동 복구**: 사용자가 로그아웃 또는 토큰 만료로 보호된 API 호출이 실패하더라도, 프런트가 즉시 익명 로그인 또는 refresh 로직을 재시도해 UX를 끊김 없이 유지한다.
