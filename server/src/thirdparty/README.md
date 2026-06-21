# Third-party APIs

## TJ Media

- `POST https://www.tjmedia.com/legacy/api/newSongOfMonth`
  - 설명: `searchYm=YYYYMM` 기준으로 TJ 월별 신곡 목록을 가져온다.

- `GET https://www.tjmedia.com/song/accompaniment_search`
  - 설명: TJ 반주곡 검색 페이지를 조회한다.
  - 사용: `strType=16`은 곡 번호 검색, `strType=2`는 가수명 검색.
