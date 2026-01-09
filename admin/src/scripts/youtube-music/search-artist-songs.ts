/**
 * YouTube Music API로 아티스트 검색 및 곡 목록 가져오기
 *
 * 사용법:
 * pnpm tsx src/scripts/youtube-music/search-artist-songs.ts "아이유"
 * pnpm tsx src/scripts/youtube-music/search-artist-songs.ts "아이유" --limit=50
 *
 * 환경변수:
 * YOUTUBE_MUSIC_COOKIE - YouTube Music 쿠키 (필수)
 */

import "dotenv/config";
import YouTubeMusic from "youtube-music-ts-api";

const artistName = process.argv[2];
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]) : 20;

if (!artistName) {
  console.error("❌ 아티스트명을 입력하세요.");
  console.error("사용법: pnpm tsx src/scripts/youtube-music/search-artist-songs.ts \"아이유\"");
  process.exit(1);
}

const cookie = process.env.YOUTUBE_MUSIC_COOKIE;
if (!cookie) {
  console.error("❌ YOUTUBE_MUSIC_COOKIE 환경변수가 설정되지 않았습니다.");
  console.error("\n설정 방법:");
  console.error("1. YouTube Music (https://music.youtube.com) 접속");
  console.error("2. 개발자 도구 열기 (F12)");
  console.error("3. Network 탭에서 '/browse' 요청 찾기");
  console.error("4. Request Headers에서 'cookie' 값 복사");
  console.error("5. .env 파일에 YOUTUBE_MUSIC_COOKIE=<복사한값> 추가");
  process.exit(1);
}

async function main() {
  console.log("🎵 YouTube Music API 초기화 중...\n");

  const ytmusic = new YouTubeMusic();
  await ytmusic.initialize({ cookies: cookie });

  console.log(`🔍 아티스트 검색: "${artistName}"\n`);
  console.log("=".repeat(80));

  // 1. 아티스트 검색
  const searchResults = await ytmusic.searchArtists(artistName);

  if (!searchResults || searchResults.length === 0) {
    console.log("❌ 검색 결과가 없습니다.");
    return;
  }

  console.log(`\n📋 검색된 아티스트 목록 (${searchResults.length}개):\n`);
  searchResults.slice(0, 5).forEach((artist: any, index: number) => {
    console.log(`${index + 1}. ${artist.name}`);
    console.log(`   Artist ID: ${artist.id}`);
    if (artist.subscribers) {
      console.log(`   구독자: ${artist.subscribers}`);
    }
    console.log("");
  });

  // 2. 첫 번째 아티스트 선택
  const topArtist = searchResults[0];
  console.log("=".repeat(80));
  console.log(`\n🎤 선택된 아티스트: ${topArtist.name}`);
  console.log(`   Artist ID: ${topArtist.id}\n`);
  console.log("=".repeat(80));

  console.log("\n⏳ 아티스트 상세 정보 가져오는 중...\n");

  // 3. 아티스트 상세 정보
  const artistDetail = await ytmusic.getArtist(topArtist.id);

  if (!artistDetail) {
    console.log("⚠️  아티스트 정보를 찾을 수 없습니다.");
    return;
  }

  // 곡 목록 수집
  const allSongs: any[] = [];

  if (artistDetail.topSongs) {
    allSongs.push(...artistDetail.topSongs);
  }

  if (artistDetail.songs && artistDetail.songs.products) {
    allSongs.push(...artistDetail.songs.products);
  }

  if (allSongs.length === 0) {
    console.log("⚠️  곡 정보를 찾을 수 없습니다.");
    console.log("\n아티스트 데이터 구조:");
    console.log("topSongs:", artistDetail.topSongs?.length || 0);
    console.log("songs:", artistDetail.songs?.products?.length || 0);
    console.log("albums:", artistDetail.albums?.products?.length || 0);
    return;
  }

  const songsToShow = allSongs.slice(0, limit);

  console.log(`\n🎵 곡 목록 (${songsToShow.length}/${allSongs.length}개):\n`);
  console.log("=".repeat(80));

  songsToShow.forEach((song: any, index: number) => {
    console.log(`\n${index + 1}. ${song.name}`);
    console.log(`   Video ID: ${song.id}`);

    if (song.artist) {
      console.log(`   아티스트: ${song.artist.name}`);
    }

    if (song.album) {
      console.log(`   앨범: ${song.album.name}`);
    }

    if (song.duration) {
      console.log(`   재생시간: ${song.duration}`);
    }
  });

  console.log("\n" + "=".repeat(80));
  console.log(`\n✅ 총 ${allSongs.length}곡 발견`);

  // 4. 앨범 정보
  if (artistDetail.albums && artistDetail.albums.products) {
    console.log(`\n💿 앨범 (${artistDetail.albums.products.length}개):`);
    artistDetail.albums.products.slice(0, 10).forEach((album: any, index: number) => {
      console.log(`   ${index + 1}. ${album.name} (${album.year || "연도 불명"})`);
    });
  }

  // 5. 싱글 정보
  if (artistDetail.singles && artistDetail.singles.products) {
    console.log(`\n💽 싱글 (${artistDetail.singles.products.length}개):`);
    artistDetail.singles.products.slice(0, 10).forEach((single: any, index: number) => {
      console.log(`   ${index + 1}. ${single.name} (${single.year || "연도 불명"})`);
    });
  }

  console.log("\n" + "=".repeat(80));
  console.log("✨ 완료!");
}

main().catch((error) => {
  console.error("\n❌ 오류 발생:", error.message);
  if (error.stack) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
  process.exit(1);
});
