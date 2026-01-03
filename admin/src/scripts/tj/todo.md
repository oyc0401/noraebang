dev_20260103_033101.dump
에서

가수 리스트 파싱
pnpm tsx src/scripts/tj/reparse-artists.ts

song에 저장
pnpm ts-node src/scripts/tj/auto-map-artists.ts --force

가수 분류 검사 json 생성
pnpm ts-node src/scripts/artist/find-name-collisions.ts