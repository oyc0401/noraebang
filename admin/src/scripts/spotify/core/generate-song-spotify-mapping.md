# generate-song-spotify-mapping.ts

## 목적
- 단일 artistId 의 Song / SpotifyTrack 데이터를 DB 에서 읽어 `artist-mapping.json` 과 `artist-mapping-stats.json` 을 생성합니다.
- `findBestMatch` 기반 알고리즘으로 SpotifyTrack ↔ Song 자동 매칭 + 후보 목록을 산출합니다.

## 매칭 알고리즘 요약
1. 트랙별로 `musicBrainzTitle → song.title`, `track.name → song.title`, `musicBrainzTitle → titleKo`, `track.name → titleKo` 순으로 비교합니다.
2. `findBestMatch` 는 3개의 레이어를 순차 적용합니다.
   - **Layer 1.x**: 공백 정규화/제거, 소문자화까지 적용하며 완전 일치하면 즉시 확정.
   - **Layer 2.0**: prefix-safe 매칭(단어 경계 기반)일 경우 확정.
   - **Layer 3.x**: `partialSimilarity` 점수로 상위 후보를 정렬하고, `score>=0.92` & `margin>=0.06` 인 경우 answer 로 채택. 0.82 이상은 candidate 로 최대 5개 남깁니다.
3. answer 가 있으면 해당 Song 의 `id` 를 `songs` 배열에 넣고, 나머지는 `candidateSong` 배열에 저장합니다.
4. 통계 파일에는 총 곡 수, Spotify 트랙 수, answer 개수, 후보만 존재하는 케이스 등을 기록합니다.

## 실행 예시
```bash
pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts 40
```
- `artist-mapping.json` / `artist-mapping-stats.json` 이 현재 작업 디렉터리에 저장됩니다.

## JSON 입력 버전
- `generate-song-spotify-mapping copy.ts` 는 DB 대신 `artist-songs.json` 입력을 받아 동일한 매칭/통계 로직을 수행합니다.
```bash
pnpm ts-node "src/scripts/spotify/generate-song-spotify-mapping copy.ts" artist-songs.json
```
