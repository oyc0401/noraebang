# 운영 DB schema 분리 전환 플랜

## 결론

개발 DB를 별도 원본으로 두지 않는다.

운영 PostgreSQL database 하나를 진짜 원본으로 삼고, 그 안에서 schema를 나눈다.

```txt
운영 PostgreSQL database
├─ source schema
│  ├─ 전곡
│  ├─ KPOP
│  ├─ JPOP
│  ├─ tjSongId 없는 곡
│  ├─ 미연결 TjSong
│  ├─ 수집 raw 데이터
│  ├─ 매핑 후보
│  └─ cronjob 수집 결과
│
├─ song schema
│  ├─ 앱이 실제 조회하는 published catalog
│  ├─ JPOP
│  ├─ tjSongId가 있는 Song
│  ├─ 연결된 TjSong
│  ├─ 연결된 Artist
│  └─ 검색/상세 화면에 필요한 관계 데이터
│
└─ app schema
   ├─ 유저
   ├─ 인증/세션
   ├─ 신고
   ├─ 검색 기록
   ├─ 클릭 기록
   └─ 운영 중 사용자가 만드는 데이터
```

로컬 DB는 더 이상 소스 오브 트루스가 아니다. 필요할 때 운영 DB를 복제해서 실험하는 sandbox로만 쓴다.

## 왜 이 방향인가

이 서비스의 곡/아티스트/TJ 데이터는 대부분 read-only 카탈로그에 가깝다. 하지만 cronjob으로 TJ 최신곡을 수집하면 운영 DB에 바로 반영되어야 한다. 이 요구가 있으면 "로컬 개발 DB에서 정리한 뒤 운영 DB에 덤프 배포" 방식은 어색해진다.

운영에서 생긴 신곡을 다시 로컬 개발 DB로 가져오고, 다음 덤프 배포에 포함시키는 역동기화 규칙이 필요해지기 때문이다. 이 규칙은 실수하기 쉽고, 한 번 놓치면 운영에 추가됐던 곡이 다음 배포 때 사라질 수 있다.

그래서 원본을 운영 DB 하나로 모은다. 대신 앱이 직접 조회하는 가벼운 카탈로그와, 수집/정제에 필요한 무거운 원본 데이터를 schema로 분리한다.

핵심 원칙은 아래와 같다.

```txt
source schema = 수집/정제/전곡 원본
song schema = 서비스에 노출되는 가벼운 카탈로그
app schema = 사용자/운영 쓰기 데이터
```

앱은 기본적으로 `song`과 `app`만 사용한다. `source`는 관리자 작업과 cronjob이 사용한다.

## PostgreSQL schema 개념

PostgreSQL 구조는 대략 이렇다.

```txt
PostgreSQL 서버
└─ database
   └─ schema
      └─ table
```

`schema`는 database 안의 namespace 또는 폴더에 가깝다.

운영 DB 접속 URL은 하나다.

```txt
postgresql://user:password@host:5432/song_prod
```

그 하나의 database 안에 `source`, `song`, `app` schema를 둔다.

```txt
song_prod database
├─ source schema
├─ song schema
└─ app schema
```

database를 여러 개 연결하는 방식이 아니므로 앱의 기본 DB 연결은 하나로 유지할 수 있다.

## schema별 역할

### source schema

수집과 정제를 위한 원본 영역이다.

여기에는 무거운 데이터가 있어도 된다.

- 전곡
- KPOP
- JPOP
- `tjSongId` 없는 곡
- 미연결 `TjSong`
- TJ 최신곡 수집 결과
- Spotify/YouTube 수집 raw 데이터
- 매핑 후보
- 관리자 검수용 데이터
- 실패한 매칭 기록

cronjob은 기본적으로 `source`에 먼저 쓴다.

예를 들어 TJ 최신곡 cronjob은 새 `TjSong`을 `source`에 저장하고, 아티스트와 곡 매칭을 시도한다. 매칭 결과가 서비스 기준을 만족하면 `song` schema에도 publish한다.

### song schema

앱이 실제로 조회하는 카탈로그 영역이다.

여기에는 운영에 노출할 준비가 된 데이터만 둔다.

기본 publish 조건은 아래로 잡는다.

```txt
Song.catalog = "JPOP"
Song.tjSongId IS NOT NULL
```

`song` schema에는 이 조건을 만족하는 곡과, 그 곡을 보여주기 위해 필요한 관계만 둔다.

- `Song`
- `TjSong`
- `Artist`
- `ArtistSong`
- `ArtistTjSong`
- `SongAlias`
- `SpotifyArtist`
- `SpotifyTrack`
- `SongSpotifyTrack`
- `YoutubeInfo`
- `YoutubeVideo`
- `SongYoutubeVideo`
- 검색/상세 화면에 필요한 썸네일, 점수, 표시용 필드

`KaraokeSong`은 deprecated로 본다. 새 기준은 `Song.tjSongId`다.

### app schema

사용자와 운영 중 쓰기 데이터 영역이다.

여기는 catalog publish와 분리한다.

- 유저 계정
- 인증/refresh token
- 신고
- 검색 기록
- URL 검색 기록
- 클릭 기록
- 사용자 히스토리
- 나중에 추가될 즐겨찾기, 플레이리스트, 설정

`app` schema는 카탈로그 재생성이나 song publish 작업으로 지워지면 안 된다.

## 데이터 흐름

### cronjob 신곡 수집

cronjob은 운영 DB에서 돈다.

```txt
TJ 최신곡 cronjob
→ source schema에 TjSong/Song 후보 저장
→ 아티스트 매칭
→ 곡 매칭 또는 생성
→ publish 조건 만족 시 song schema에 upsert
→ Typesense에 부분 반영 또는 재인덱싱
```

이 흐름에서는 운영 DB가 원본이다. 따라서 운영에 새로 추가된 곡을 로컬 개발 DB로 다시 가져올 필요가 없다.

### 관리자 수동 정제

관리자 화면은 원칙적으로 `source`를 보고 정제한다.

정제 결과가 서비스 기준을 만족하면 `song` schema에 publish한다.

```txt
관리자 수정
→ source schema 수정
→ publish 가능 여부 판단
→ song schema upsert
→ Typesense 반영
```

### 앱 조회

사용자 앱은 `song` schema를 조회한다.

```txt
검색
→ Typesense
→ song schema의 Song/Artist/TjSong 상세 조회

곡 상세
→ song schema

아티스트 상세
→ song schema

신고/검색 기록/유저 데이터
→ app schema
```

앱 조회 경로에 `source`가 들어오지 않게 한다. 그래야 전곡과 작업용 데이터가 많아도 서비스 조회가 무거워지지 않는다.

## publish 규칙

`source`에서 `song`으로 publish할 때의 기본 조건은 아래다.

```sql
catalog = 'JPOP'
AND tj_song_id IS NOT NULL
```

이 조건을 만족하지 않으면 `song` schema로 내보내지 않는다.

예외가 필요하면 명시적인 플래그를 둔다.

예:

```txt
publishStatus = PUBLISHED | DRAFT | HIDDEN
```

초기에는 복잡한 상태 머신을 만들지 않고, `catalog`와 `tjSongId` 기준으로 시작한다.

## Typesense 인덱싱 기준

Typesense는 `song` schema 기준으로 인덱싱한다.

곡 인덱싱 조건은 publish 조건과 같아야 한다.

```txt
JPOP + tjSongId 있음
```

운영 검색에 KPOP이나 TJ 번호 없는 곡이 나오면 안 된다.

cronjob이 신곡을 `song` schema에 publish한 뒤에는 둘 중 하나를 한다.

- 해당 곡만 Typesense에 upsert
- 단순성을 위해 일정 주기로 전체 재인덱싱

초기에는 전체 재인덱싱으로 시작해도 된다. 곡 수가 커져 부담이 되면 부분 upsert로 바꾼다.

## Prisma 스키마 방향

Prisma model을 schema별로 나누는 방향으로 간다.

예시:

```prisma
model Song {
  id       Int     @id @default(autoincrement())
  title    String
  catalog  String?
  tjSongId String? @map("tj_song_id")

  @@schema("song")
  @@map("song")
}

model SourceSong {
  id       Int     @id @default(autoincrement())
  title    String
  catalog  String?
  tjSongId String? @map("tj_song_id")

  @@schema("source")
  @@map("song")
}

model Report {
  id     Int @id @default(autoincrement())
  songId Int @map("song_id")

  @@schema("app")
  @@map("report")
}
```

`source.song`과 `song.song`은 같은 물리 테이블이 아니다. 같은 이름의 테이블이어도 schema가 다르면 다른 테이블이다.

초기에는 기존 `public` schema를 바로 쪼개는 대신, 단계적으로 옮긴다.

## 권한 설계

가능하면 DB user 권한도 나눈다.

```txt
app runtime user
- song schema read
- app schema read/write
- source schema 접근 없음

admin/cron user
- source schema read/write
- song schema read/write
- app schema 제한적 접근 또는 없음

migration user
- 모든 schema DDL 권한
```

앱 런타임이 `source`에 접근하지 못하게 막으면, 실수로 무거운 원본 테이블을 조회하는 위험을 줄일 수 있다.

## 마이그레이션 단계

### 1단계: schema 역할 확정

세 schema의 역할을 확정한다.

```txt
source = 전곡/수집/정제
song = 서비스 카탈로그
app = 사용자 데이터
```

현재 테이블을 어느 schema로 보낼지 목록화한다.

### 2단계: 운영 DB에 schema 생성

운영 DB에 schema를 만든다.

```sql
CREATE SCHEMA source;
CREATE SCHEMA song;
CREATE SCHEMA app;
```

초기에는 로컬 또는 staging에서 먼저 검증한다.

### 3단계: app 테이블 분리

유저/신고/검색 기록처럼 운영 중 쓰기 데이터부터 `app` schema로 분리한다.

이 영역은 catalog publish와 독립적이어야 한다.

### 4단계: song schema 생성

앱이 조회할 catalog 테이블을 `song` schema에 만든다.

초기 데이터는 기존 DB에서 아래 조건으로 복사한다.

```sql
catalog = 'JPOP'
AND tj_song_id IS NOT NULL
```

이때 FK와 관계 테이블도 함께 맞춘다.

### 5단계: source schema 정리

전곡과 작업용 데이터를 `source` schema에 둔다.

기존 `public` schema를 바로 없애지 말고, 전환 기간에는 읽기 경로를 명확히 하면서 점진적으로 이동한다.

### 6단계: 앱 조회 경로 변경

backend API가 `song` schema를 기준으로 읽도록 바꾼다.

검색, 곡 상세, 아티스트 상세, Typesense 인덱싱이 모두 `song` schema를 기준으로 동작해야 한다.

### 7단계: cronjob publish 흐름 변경

TJ 최신곡 cronjob을 운영 DB 기준으로 바꾼다.

```txt
source에 저장
→ 매칭
→ publish 가능하면 song에 upsert
→ Typesense 반영
```

### 8단계: public schema 의존 제거

남아 있는 `public` schema 의존을 제거한다.

전환이 끝나면 `public`은 비워두거나 최소한의 migration metadata만 남긴다.

## 검증 체크리스트

전환 중 아래를 계속 확인한다.

- 앱 검색 결과에 KPOP이 나오지 않는가
- 앱 검색 결과에 `tjSongId` 없는 곡이 나오지 않는가
- 곡 상세가 `song` schema 기준으로 정상 조회되는가
- 아티스트 상세가 `song` schema 기준으로 정상 조회되는가
- cronjob으로 추가된 신곡이 `source`와 `song`에 기대대로 들어가는가
- `app` schema의 유저/신고/검색 기록이 catalog publish 과정에서 보존되는가
- Typesense 인덱싱 수와 `song` schema의 publish 대상 곡 수가 일치하는가
- 앱 런타임 DB user가 `source`를 조회할 수 없는가

## 롤백 전략

전환 전 현재 운영 DB dump를 보관한다.

각 단계는 가능하면 staging에서 먼저 검증한다.

문제가 생기면 아래 순서로 되돌린다.

```txt
1. 앱 DATABASE_URL 또는 배포 버전을 이전 상태로 되돌린다.
2. 필요하면 이전 DB dump를 restore한다.
3. Typesense collection을 이전 기준으로 다시 인덱싱한다.
```

schema 전환은 한 번에 끝내려고 하지 않는다. `app` 분리, `song` 생성, `source` 정리, cronjob 변경을 나누어 진행한다.

## 당장 하지 않을 것

초기에는 아래를 하지 않는다.

- 로컬 개발 DB를 원본으로 유지하는 역동기화 구조
- 운영 DB 안에 별도 전곡 운영 DB를 하나 더 만드는 구조
- 앱에서 database 연결 두 개를 직접 관리하는 구조
- 변경분 기반 복잡한 event pipeline
- `KaraokeSong` 기반 publish 조건

지금 필요한 것은 운영 DB 하나 안에서 원본, 서비스 카탈로그, 사용자 데이터를 명확히 분리하는 것이다.

## 최종 판단

이 구조는 cronjob 실시간 반영 요구와 잘 맞는다.

운영 DB가 원본이므로, 운영에서 수집된 신곡이 다음 배포 때 사라지는 문제가 없다. 동시에 앱은 `song` schema만 조회하므로 전곡과 작업용 데이터 때문에 무거워지는 문제를 피할 수 있다.

로컬 DB는 앞으로 원본이 아니라 sandbox다. 큰 정제나 실험이 필요하면 운영 DB를 복제해서 로컬에서 검증하고, 검증된 작업만 운영 `source`와 `song` 흐름에 반영한다.
