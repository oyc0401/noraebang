# auto-apply-all-artists.ts

## 목적
- artistId 범위를 순회하며 매핑 생성과 적용을 자동화합니다.
- 완전 매칭(총 곡 수 == tracksWithAnswer) 인 경우에만 자동 적용하고, 불일치는 수동 검토 대상으로 남깁니다. `--force` 로 강제 적용 가능.

## 플로우
1. `--start/--end` 로 지정한 artistId 구간(기본 1~272)을 순회합니다.
2. 각 아티스트마다 `generate-song-spotify-mapping.ts` 를 실행해 `artist-mapping.json`/`artist-mapping-stats.json` 을 생성합니다.
3. 스탯 파일의 `totalSongs` 와 `tracksWithAnswer` 를 비교합니다.
   - 일치하면 `apply-song-spotify-mapping.ts` 를 실행 (dry-run 모드면 실행 대신 로그).
   - 불일치 시 기본적으로 skip, `--force` 이면 경고 후에도 적용합니다.
4. 처리 결과를 메모리에 기록하고 종료 시 `auto-apply-results.json` 으로 저장합니다.

## 실행 예시
```bash
pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --start 1 --end 50
pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --force
pnpm ts-node src/scripts/spotify/auto-apply-all-artists.ts --dry-run
```
