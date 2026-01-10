# generate-song-spotify-mapping copy.ts

## 목적
- `export-artist-songs-json.ts` 등으로 생성한 JSON 파일을 입력으로 받아 SpotifyTrack ↔ Song 매핑을 생성합니다.
- DB 접근 권한 없이도 동일한 매칭 로직을 재현할 수 있습니다.

## 입력
```json
{
  "artist": {...},
  "songs": [{ "id": 1, "title": "..." }],
  "spotifyTracks": [{ "id": 2, "title": "...", "musicBrainzTitle": "..." }]
}
```

## 알고리즘
- `generate-song-spotify-mapping.ts` 와 동일하게 `findBestMatch` 를 네 가지 조합(musicBrainzTitle/title × title/titleKo)으로 실행합니다.
- Answer 가 확정되면 `songs` 배열에, 확정 실패 시 점수 상위 후보를 `candidateSong` 에 최대 5개까지 저장합니다.
- 결과 매핑은 `<입력파일>-mapping.json`, 통계는 `<입력파일>-mapping-stats.json` 으로 저장됩니다.

## 실행 예시
```bash
pnpm ts-node "src/scripts/spotify/generate-song-spotify-mapping copy.ts" artist-songs.json
```
