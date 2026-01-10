## 중복제거
pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts


## json 생성
pnpm ts-node src/scripts/artist/export-artist-songs-json.ts 40 > artist-songs.json

## 매핑생성
pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts artist-songs.json


## 또는 바로 매핑생성 
pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts 40