# disable-duplicate-tracks.ts

## 목적
- artist.id < 300 범위에 속한 SpotifyTrack 의 `disabled` 값을 “완전 재계산”합니다.
- 패턴·제목 중복을 한 번에 정리해 수동 정비 없이 깨끗한 매핑 입력을 제공합니다.

## 알고리즘
1. Artist → SpotifyArtist → SpotifyTrack 을 모두 적재하여 `tracksBySpotifyArtistId` 맵을 만듭니다.
2. **패턴 중복 필터**: `isDuplicateTrack(track.name)` 이 `true` 면 제거 세트에 추가합니다.
3. **제목 중복 필터**: 같은 아티스트 내에서 `name` / `musicBrainzTitle` 이 겹치는 트랙을 Union-Find 로 묶고,
   - `popularity desc, id asc` 규칙으로 대표 1곡을 keep,
   - 나머지를 제거 세트에 추가합니다.
4. 스코프 내 모든 트랙을 `disabled=false` 로 초기화한 뒤, 제거 세트만 `disabled=true` 로 세팅합니다.
5. `--dry-run` 모드에서는 통계·샘플만 출력하고 DB 는 수정하지 않습니다.

## 실행 예시
```bash
pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts --dry-run
pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts
```
