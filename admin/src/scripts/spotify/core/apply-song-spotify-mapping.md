# apply-song-spotify-mapping.ts

## 목적
- `generate-song-spotify-mapping.ts` 가 만든 `artist-mapping.json` 을 읽어 Song 과 SpotifyTrack 을 `SongSpotifyTrack` 테이블에 실제로 연결합니다.

## 동작
1. JSON 파일을 파싱해 각 SpotifyTrack 항목의 `songs` 배열을 순회합니다.
2. 곡마다 `songId` 를 unique key 로 upsert 하여 기존 연결이 있으면 업데이트, 없으면 생성합니다.
3. `--dry-run` 옵션 시 DB 는 수정하지 않고 어떤 연결이 생길지 로그만 출력합니다.

## 실행 예시
```bash
pnpm ts-node src/scripts/spotify/apply-song-spotify-mapping.ts --dry-run
pnpm ts-node src/scripts/spotify/apply-song-spotify-mapping.ts
```
