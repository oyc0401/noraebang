# apply-duplicate-artists.ts

fetch-and-link-artists.json에 기록된 중복 아티스트들의 spotifyId를 등록하는 스크립트입니다.

## 배경

`fetch-and-link-artists.ts` 스크립트를 실행할 때, 이미 다른 아티스트가 같은 Spotify ID를 가지고 있는 경우 중복으로 기록됩니다. 이전에는 `Artist.spotifyId`에 유니크 제약이 있어서 중복 등록이 불가능했지만, 유니크 제약을 제거한 후에는 여러 아티스트가 같은 Spotify ID를 가질 수 있게 되었습니다.

이 스크립트는 `fetch-and-link-artists.json`에 기록된 중복 항목들을 실제로 등록합니다.

## 사용법

### Dry run (실제 변경 없이 확인만)
```bash
pnpm ts-node src/scripts/spotify/apply-duplicate-artists.ts --dry-run
```

### 실제 등록
```bash
pnpm ts-node src/scripts/spotify/apply-duplicate-artists.ts
```

## 동작 방식

1. `fetch-and-link-artists.json` 파일의 `duplicates` 배열을 읽습니다
2. 각 항목에 대해:
   - Artist가 존재하는지 확인
   - 이미 등록되어 있는지 확인
   - spotifyId를 업데이트
3. 결과 요약을 출력합니다

## JSON 파일 형식

```json
{
  "duplicates": [
    {
      "id": 323,
      "name": "보아",
      "spotifyArtistId": "4muJrGMndyYWqZtfk8OWy4",
      "targetId": 76,
      "targetName": "BoA"
    }
  ]
}
```

- `id`: spotifyId를 등록할 Artist ID
- `name`: Artist 이름
- `spotifyArtistId`: 등록할 Spotify Artist ID
- `targetId`: 이미 같은 spotifyId를 가지고 있는 다른 Artist ID
- `targetName`: 타겟 Artist 이름

## 주의사항

- 이 스크립트는 기존에 설정된 spotifyId를 덮어씁니다
- dry-run으로 먼저 확인하는 것을 권장합니다
