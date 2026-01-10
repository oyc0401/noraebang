# search-artist-channels.ts

아티스트에게 연결된 YouTube Topic/Main 채널 정보를 자동으로 찾아 `youtubeChannel` 테이블에 저장하는 스크립트입니다. 아직 Topic 채널이 없는 아티스트만 대상으로 하며, YouTube Data API를 사용해 채널을 검색하고 세부 정보까지 수집합니다.

## 준비 사항
- `pnpm install` 로 루트 의존성을 설치합니다.
- `admin/.env` 또는 루트 `.env` 에 `DATABASE_URL` 을 설정해 Postgres에 접근할 수 있어야 합니다.
- YouTube Data API 키는 `admin/src/thirdparty/youtube/keys/keys.ts` 에 정의돼 있습니다. 필요시 해당 파일에서 키를 갱신하거나 추가합니다.

## 실행 방법
```bash
# admin 디렉터리 기준
pnpm ts-node src/scripts/youtube/search-artist-channels.ts [startId] [limit]

# 루트에서 실행할 경우
pnpm --filter admin ts-node src/scripts/youtube/search-artist-channels.ts [startId] [limit]
```

| 인자 | 설명 |
| --- | --- |
| `startId` | 특정 아티스트 ID 이상만 처리합니다. 생략하면 기존 Topic 채널이 있는 가장 마지막 아티스트 다음 ID부터 시작합니다. |
| `limit` | 한 번에 처리할 아티스트 수를 제한합니다. 생략하면 조건을 만족하는 모든 아티스트를 순회합니다. |

실행 중 YouTube API 쿼터를 소진하면 에러와 함께 마지막으로 처리한 아티스트 ID를 출력하므로, `startId` 에 해당 값을 넣고 재시작하면 이어서 진행할 수 있습니다.

## 동작 개요
1. Topic 채널이 없는 아티스트 목록을 ID 오름차순으로 가져옵니다. (`batchSize` 옵션이 있으면 그 수만큼만 조회)
2. 각 아티스트 이름으로 YouTube 채널을 검색하고, 제목이 `" - Topic"` 으로 끝나는 채널을 최우선으로 선택합니다.
3. 선택된 Topic 채널 ID로 세부 정보를 다시 조회한 뒤 `ChannelType.TOPIC` 으로 upsert 합니다.
4. Topic 제목에서 `" - Topic"` 을 제거한 문자열과 동일한 제목의 일반 채널이 존재하고, 해당 채널의 구독자 수가 Topic 채널보다 많으면 `ChannelType.MAIN` 으로 추가/갱신합니다.
5. 각 단계의 로그와 최종 요약(총 처리 수, 갱신 수, 미발견 수, 에러 수, Main 승격 수)을 출력합니다.

## 참고 사항
- YouTube API 요청마다 200ms 지연을 두어 속도 제한을 완화합니다.
- `dotenv` 로 환경 변수를 불러오므로 `.env` 파일이 필요합니다.
- 실패 시 `prisma.$disconnect()` 와 PG 풀을 정리하므로 장시간 실행해도 리소스가 누수되지 않습니다.
- 대량 실행 전에는 DB 백업을 권장합니다. Topic/Main 채널이 이미 존재한다면 upsert 로 안전하게 덮어쓰지만, 잘못된 API 결과가 저장될 수 있으니 주의하세요.
