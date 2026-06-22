기본 헬스체크
GET
/

 DB 연결 헬스체크
GET
/health/db

AdminPage

어드민 프론트 페이지 서빙
GET
/admin

어드민 프론트 페이지 서빙
GET
/admin/{path}

artist-creation-queue

아티스트 생성 큐에 들어있는 정보를 얻는다.
GET
/api/artist-creation-queue

아티스트 생성 큐에 tj번호를 넣는다.
POST
/api/artist-creation-queue/push

아티스트 생성 큐에 있는 특정 id의 아티스트를 생성한다.
POST
/api/artist-creation-queue/{queueId}/create-artist

아티스트 생성 큐 항목 제거
DELETE
/api/artist-creation-queue/{queueId}

parser

TJ 월별 신곡 API를 실행, 신규곡 발견시 큐에 넣음
POST
/api/parser/recent

TJ 가수검색 실행, 신규곡 발견시 큐에 넣음
POST
/api/parser/search

신곡 파서 마지막 실행 시각 조회.
GET
/api/parser/recent/log

TJ 가수검색 파서 마지막 실행 시각 조회.
GET
/api/parser/search/log

queue

최근곡 큐 조회
GET
/api/queue

최근곡 큐 삭제
POST
/api/queue/remove

song-artist-queue

곡-가수 큐 조회
GET
/api/song-artist-queue

곡-가수큐에 노래 추가
POST
/api/song-artist-queue/push

곡-가수큐 항목 하나를 기존 artist에 수동연결
PATCH
/api/song-artist-queue/{queueId}/artist

song

tj 곡 조회
GET
/api/song
