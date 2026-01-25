# 노래방 번호 찾기

노래방에서 일본어 곡을 쉽게 찾을 수 있도록 도와주는 서비스입니다.

## 프로젝트 배경

노래방에서 일본어 곡을 찾기 어려운 문제에서 시작되었습니다. 기존에는 "프리텐더 노래방"처럼 구글 검색을 통해 번호를 찾아야 했습니다. 이 프로젝트는 검색을 통해 노래방 번호를 빠르게 찾고, 원하는 곡이 없을 때 TJ 노래 신청까지 쉽게 할 수 있는 경험을 제공합니다.

## 주요 기능

- **노래방 번호 검색**: 곡 제목이나 아티스트 이름으로 TJ/금영 노래방 번호 검색
- **링크 공유 검색**: 유튜브 뮤직 / 스포티파이 링크를 공유하면 해당 곡의 노래방 번호 확인
- **TJ 노래 신청**: 원하는 곡이 없을 때 TJ 노래 신청 페이지로 빠르게 연결

## 향후 계획

1. **전체 곡 커버리지 확대**: 대부분의 노래방 곡을 유튜브 뮤직/스포티파이 링크로 검색할 수 있도록 데이터 확장 (최우선 과제)
2. **플레이리스트 지원**: 원피스 노래 모음 등 테마별 플레이리스트 제공
3. **개인 맞춤 추천**: 사용자 취향에 맞는 노래방 추천곡 제공

## 기술 스택

### 백엔드
- NestJS
- Prisma + PostgreSQL
- Typesense (검색 엔진)
- Passport (인증)

### 프론트엔드
- Next.js
- TanStack Query + Orval
- Zustand
- Tailwind CSS
- React Hook Form + Zod

### 어드민
- Next.js
- Prisma (직접 접근)

## 프로젝트 구조

```
song/
├── backend/          # NestJS API 서버
├── frontend/         # Next.js 사용자 웹앱
├── admin/            # Next.js 어드민 패널
└── mcp-server/       # MCP 서버
```

## 데이터 구조

### 핵심 엔티티

| 엔티티 | 설명 |
|--------|------|
| Artist | 아티스트 정보 (일본어/한국어/영문 이름 지원) |
| Song | 곡 정보 (제목 다국어 지원, 노래방 번호 연결) |
| TjSong | TJ 노래방 원본 곡 데이터 |
| KaraokeSong | 노래방 번호 (TJ, 금영, JOYSOUND 지원) |

### 연동 데이터

| 엔티티 | 설명 |
|--------|------|
| SpotifyTrack | 스포티파이 트랙 정보 |
| SpotifyArtist | 스포티파이 아티스트 정보 |
| YoutubeVideo | 유튜브 비디오 정보 |
| YoutubeChannel | 유튜브 채널 정보 |

### 사용자 기능

| 엔티티 | 설명 |
|--------|------|
| User | 사용자 계정 |
| SearchHistory | 검색 기록 |
| SearchClick | 검색 결과 클릭 기록 |
| SongPropose | TJ 노래 신청 내역 |
| Report | 오류 신고 |

## 설치 및 실행

```bash
# 의존성 설치
pnpm install

# Prisma 클라이언트 생성
pnpm generate

# 개발 서버 실행 (백엔드 + 프론트엔드 + 어드민)
pnpm dev
```

## API 서버

- 백엔드: `http://localhost:3001`
- Swagger 문서: `http://localhost:3001/api`
