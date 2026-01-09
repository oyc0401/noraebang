# TJ Media API

TJ 미디어 웹사이트에서 곡 정보를 스크래핑하는 유틸리티

## 사용법

### getTJSongByArtist

가수명으로 TJ 곡 정보를 모두 가져옵니다.

```typescript
import { getTJSongByArtist, type TJSongInfo } from "@/thirdparty/tj";

const songs = await getTJSongByArtist("아이유");

console.log(`Total songs: ${songs.length}`);

songs.forEach((song) => {
  console.log(`${song.songNumber} - ${song.title}`);
  console.log(`  MR: ${song.isMR}, MV: ${song.isMV}`);
  console.log(`  작사가: ${song.lyricist}`);
  console.log(`  작곡가: ${song.composer}`);
  if (song.youtubeLink) {
    console.log(`  유튜브: ${song.youtubeLink}`);
  }
});
```

#### TJSongInfo 타입

```typescript
interface TJSongInfo {
  songNumber: string;       // 곡번호 (예: "87810")
  isMR: boolean;           // MR 반주 여부
  isMV: boolean;           // MV 반주 여부
  isOver60: boolean;       // 60이상 반주기 전용곡 여부
  title: string;           // 곡 제목
  artist: string;          // 가수명
  lyricist?: string;       // 작사가 (선택적)
  composer?: string;       // 작곡가 (선택적)
  youtubeLink?: string;    // 유튜브 링크 (선택적)
}
```

## 테스트

```bash
# admin 폴더에서
npx tsx src/thirdparty/tj/script/test-get-songs.ts "아이유"
```

## 주의사항

- 이 함수는 TJ 미디어 웹사이트의 HTML을 스크래핑합니다
- 웹사이트 구조가 변경되면 동작하지 않을 수 있습니다
- 페이지 수가 많은 경우 시간이 걸릴 수 있습니다 (병렬 처리로 최적화됨)
