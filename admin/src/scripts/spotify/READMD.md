## 중복제거
pnpm ts-node src/scripts/spotify/disable-duplicate-tracks.ts


## json 생성
pnpm ts-node src/scripts/artist/export-artist-songs-json.ts 40 > artist-songs.json

## 매핑생성
pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts artist-songs.json


## 또는 바로 매핑생성 
pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts 40


## 매핑json으로 실제 연결
pnpm ts-node src/scripts/spotify/apply-song-spotify-mapping.ts




## 자동으로 하기.
pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --force

## 자동완성
ai 자동화해줘.                                                                                                 
pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts {artistId} 를 입력해서 
admin/artist-mapping.json과  admin/artist-mapping-stats.json를 만들고,

해당 json들을 수동으로 너가 검토해줘서 너가 생각했을때 잘 매칭된것같으면,
pnpm ts-node src/scripts/spotify/apply-song-spotify-mapping.ts를 실행해줘.  

이런 작업을 아티스트 1번부터 272번까지 반복해줘.