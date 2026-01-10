# SpotifyTrackGroup 자동 생성 스크립트 로직

## 개요

같은 스포티파이 곡끼리 `SpotifyTrackGroup`으로 그룹을 짓는 스크립트입니다.

## 실행 명령어

```bash
# Dry-run (실제 DB 업데이트 없음)
pnpm ts-node src/scripts/spotify/group-duplicate-spotify-tracks.ts --dry-run

# 실제 실행
pnpm ts-node src/scripts/spotify/group-duplicate-spotify-tracks.ts
```

## 처리 범위

- **대상 아티스트**: `artist.id < 300`인 아티스트들
- **대상 트랙**: 위 아티스트들의 `spotifyId`로 연결된 `SpotifyArtist`의 트랙들

## 전체 처리 흐름

### Step 1: 대상 아티스트 조회

```
artist.id < 300인 아티스트 조회
→ spotifyId 보유 아티스트 필터링
```

### Step 2: SpotifyArtist 매핑

```
spotifyId → spotifyArtist.id 매핑
→ targetSpotifyArtistIds 생성
```

### Step 3: 트랙 링크 조회

```
spotifyArtistTrack 테이블에서 대상 아티스트들의 트랙 조회
→ spotifyArtistId → tracks[] 매핑 구성
```

### Step 4: 트랙 전처리 및 분류

각 트랙에 대해:
1. `isDuplicateTrack(track.name)` 체크 → 변형 버전 여부 판단
2. 변형 버전(라이브, 리믹스, 인스트루멘탈 등)도 그룹에 포함하되 `isDuplicateVariant=true` 플래그 설정

**변형 버전 패턴:**
- 라이브: `- Live`, `(Live)`, `Live ver.` 등
- 리믹스: `- Remix`, `- XX Remix`, `- XX Mix` 등
- 인스트루멘탈: `- Instrumental`, `- Inst.` 등
- 버전 표시: `- XX Ver.`, `(Ver.)` 등
- 출처 표시: `- from "..."`, `(from ...)` 등
- 기타: TV Size, Radio Edit, OFF VOCAL 등

### Step 5: 제목 정규화 및 그룹화 (Union-Find)

**아티스트별로 순차 처리** (아티스트1 → 아티스트2 → ...)

각 아티스트의 트랙들에 대해:

#### 5-1. 제목 정규화 (`normalizeTitle`)

```typescript
1. 변형 패턴 제거
   "夜に駆ける - Live" → "夜に駆ける "

2. 공백/괄호/하이픈 제거 및 소문자 변환
   "Love Letter" → "loveletter"
   "YOASOBI" → "yoasobi"
```

#### 5-2. Union-Find로 그룹화

```typescript
// 제목별 트랙 ID 매핑
titleToTrackIds = Map<정규화된제목, trackId[]>

// 각 트랙의 name과 musicBrainzTitle을 정규화하여 매핑
for (track of tracks) {
  normalizedName = normalizeTitle(track.name)
  titleToTrackIds[normalizedName].push(track.id)

  if (track.musicBrainzTitle) {
    normalizedMb = normalizeTitle(track.musicBrainzTitle)
    if (normalizedMb !== normalizedName) {
      titleToTrackIds[normalizedMb].push(track.id)
    }
  }
}

// 같은 정규화 제목을 가진 트랙들끼리 Union
for (trackIds of titleToTrackIds.values()) {
  union(trackIds[0], trackIds[1], ...)
}
```

**매칭 조합 (모두 커버):**
- name ↔ name
- name ↔ musicBrainzTitle
- musicBrainzTitle ↔ name
- musicBrainzTitle ↔ musicBrainzTitle

#### 5-3. Primary 선택

```typescript
function pickPrimaryByPopularity(tracks) {
  // 1. 변형 버전을 제외하고 원본 트랙만 후보로
  originalTracks = tracks.filter(t => !t.isDuplicateVariant)

  // 2. 원본이 없으면 어쩔 수 없이 변형 버전에서 선택
  candidates = originalTracks.length > 0 ? originalTracks : tracks

  // 3. popularity desc, id asc (tie-break)
  return max_popularity(candidates)
}
```

### Step 6: 변형 버전 솔로 그룹 재배치

각 아티스트의 변형 버전 트랙들에 대해:

```typescript
for (variantTrack of variantTracks) {
  // 1. 그룹에 본인만 있는지 체크 (솔로 그룹)
  if (groupTracks.length > 1) continue

  // 2. 같은 아티스트의 원본 트랙들과 매칭 시도
  originalTracks = tracks.filter(t => !t.isDuplicateVariant && t.groupId)
  candidates = originalTracks.map(t => t.name)

  // 3. findBestMatch로 매칭
  matchResult = findBestMatch(variantTrack.name, candidates)

  // 4. answer가 있으면 해당 트랙의 그룹으로 이동
  if (matchResult.answer) {
    matchedTrack = find(matchResult.answer)
    variantTrack.groupId = matchedTrack.groupId
    // fromGroup 삭제 예정
  }
}
```

**findBestMatch 동작:**
- 공백/대소문자/특수문자 정규화 후 유사도 계산
- 완전 일치, prefix-safe, partial similarity 등 다층 레이어 매칭
- `answer`가 있으면 확신 가능한 매칭

**예시:**
```
"夜に駆ける - Live" → candidates: ["夜に駆ける", "Yoru ni Kakeru"]
→ answer: "夜に駆ける" (완전 일치)
→ "夜に駆ける"가 속한 그룹으로 이동
```

### Step 7: DB 업데이트

#### 7-1. 그룹 생성/병합

각 그룹에 대해:

```typescript
// 기존 그룹 확인
existingGroupIds = group.tracks.map(t => t.groupId).filter(Boolean)

if (existingGroupIds.length > 0) {
  // 기존 그룹 사용
  groupId = existingGroupIds[0]

  // 여러 그룹이 있으면 병합 처리
  if (existingGroupIds.length > 1) {
    for (mergeGroupId of existingGroupIds.slice(1)) {
      // Song 매핑 이전 처리
      if (mergeGroup.songId && !mainGroup.songId) {
        mainGroup.songId = mergeGroup.songId
      } else if (mergeGroup.songId && mainGroup.songId) {
        // Song 충돌 → 병합 스킵
        continue
      }

      // 그룹 삭제
      delete mergeGroup
    }
  }

  // Primary 충돌 해결 후 업데이트
  if (existingPrimaryGroup && existingPrimaryGroup.id !== groupId) {
    existingPrimaryGroup.primarySpotifyTrackId = null
  }
  group.primarySpotifyTrackId = primary.id

} else {
  // 새 그룹 생성
  newGroup = create SpotifyTrackGroup + Song
  newGroup.primarySpotifyTrackId = primary.id
}

// 모든 트랙의 groupId 업데이트
updateMany(trackIds, { groupId })
```

#### 7-2. 변형 버전 재배치

```typescript
// 재배치할 트랙들 groupId 업데이트
for (relocate of relocateList) {
  update spotifyTrack[relocate.variantTrackId]
    set groupId = relocate.toGroupId
}

// 빈 그룹 삭제
emptyGroupIds = relocateList.map(r => r.fromGroupId)
deleteMany spotifyTrackGroup where id in emptyGroupIds
```

## 주요 특징

### 1. 반복 실행 안전성

- 기존 그룹이 있으면 재사용 → 그룹이 계속 늘어나지 않음
- 여러 기존 그룹이 발견되면 병합 처리 → 고아 그룹 방지

### 2. Song 매핑 안전 처리

- 병합 시 Song이 있으면 메인 그룹으로 이전
- 양쪽 다 Song이 있으면 충돌로 간주하여 병합 스킵

### 3. Primary 충돌 해결

- `primarySpotifyTrackId`는 unique constraint
- 업데이트 전에 충돌하는 그룹의 primary를 null로 변경

### 4. 아티스트 순차 처리

- 아티스트1 완료 → 아티스트2 처리 시, 아티스트1의 그룹 활용
- 트랙A가 이미 그룹1에 속해있으면, 아티스트2에서 트랙A와 같은 제목인 트랙C도 그룹1에 추가

## 통계 출력

- 대상 아티스트 수
- 변형 버전 트랙 수
- 생성할 그룹 수
- 신규 생성된 그룹 수
- 병합/삭제된 그룹 수
- Song 충돌로 병합 스킵된 수
- 재배치된 변형 버전 트랙 수
- 업데이트된 트랙 수

## 예시 시나리오

### 시나리오 1: 기본 그룹화

```
아티스트A:
  - 트랙1: name="夜に駆ける", popularity=95
  - 트랙2: name="Yoru ni Kakeru", popularity=80
  - 트랙3: name="夜に駆ける - Live", popularity=70

정규화:
  - "夜に駆ける" → "夜に駆ける"
  - "Yoru ni Kakeru" → "yorunikakeru"
  - "夜に駆ける - Live" → "夜に駆ける" (Live 제거)

결과:
  - 그룹1: 트랙1 (primary), 트랙3
  - 그룹2: 트랙2 (별도 그룹)
```

### 시나리오 2: 아티스트 간 그룹 공유

```
아티스트A:
  - 트랙1: name="夜に駆ける", groupId=null
  - 트랙2: name="夜に駆ける", groupId=null

→ 그룹1 생성, 트랙1.groupId=1, 트랙2.groupId=1

아티스트B:
  - 트랙1: name="夜に駆ける", groupId=1 (이미 설정됨)
  - 트랙3: name="夜に駆ける", groupId=null

→ 기존 그룹1 사용, 트랙3.groupId=1
```

### 시나리오 3: 변형 버전 재배치

```
아티스트A:
  - 트랙1: name="夜に駆ける", 그룹1
  - 트랙2: name="夜に駆ける - Instrumental", 그룹2 (솔로)

Step 5 완료 후:
  - 트랙2는 변형 버전, 그룹2에 본인만 존재

Step 6 재배치:
  - findBestMatch("夜に駆ける - Instrumental", ["夜に駆ける"])
  - answer: "夜に駆ける"
  - 트랙2.groupId = 1 (그룹1로 이동)
  - 그룹2 삭제
```

### 시나리오 4: 그룹 병합 (정규화)

```
기존 DB 상태:
  - 트랙1: name="Love Letter", groupId=10
  - 트랙2: name="Love-Letter", groupId=20

스크립트 실행:
  - 정규화: "Love Letter" → "loveletter"
  - 정규화: "Love-Letter" → "loveletter"
  - 같은 그룹으로 판단
  - existingGroupIds = [10, 20]
  - 그룹10 유지, 그룹20의 Song 이전 (있다면)
  - 그룹20 삭제
  - 트랙2.groupId = 10
```

## 주의사항

1. **데이터 손실 방지**: Song 충돌 시 병합하지 않고 두 그룹 모두 유지
2. **반복 실행 가능**: 여러 번 실행해도 안전하게 동작
3. **Dry-run 필수**: 실제 실행 전 반드시 `--dry-run`으로 결과 확인
4. **범위 제한**: `artist.id < 300`으로 범위 제한 (전체 실행 시 조정 필요)
