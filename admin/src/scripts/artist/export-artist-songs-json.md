# export-artist-songs-json.ts

## 목적
- 단일 artistId 를 입력받아 Song 목록과 SpotifyTrack 목록( `disabled=false` )을 JSON 으로 덤프합니다.
- 수동 검증 용도로 활용하거나 `generate-song-spotify-mapping copy.ts` 의 입력으로 사용합니다.

## 동작
1. Artist 및 ArtistSong 관계를 Prisma 로 조회해 Song `id/title/titleKo` 배열을 만듭니다.
2. Artist 에 연결된 SpotifyArtist → SpotifyTrack 중 `disabled=false` 항목만 추립니다.
3. Artist 메타 + Songs + SpotifyTracks 를 단일 JSON 객체로 만들어 stdout 에 pretty-print 합니다.

## 실행 예시
```bash
pnpm ts-node src/scripts/artist/export-artist-songs-json.ts 40 > artist-songs.json
```
- `artist-songs.json` 은 이후 수동 매칭 혹은 `generate-song-spotify-mapping copy.ts` 에서 재사용 가능합니다.
