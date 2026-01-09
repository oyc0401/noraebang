/**
 * YouTube Music API로 아티스트 검색 및 곡 목록 가져오기
 *
 * 사용법:
 * pnpm tsx src/scripts/youtube-music/search-artist-songs.ts "아이유"
 * pnpm tsx src/scripts/youtube-music/search-artist-songs.ts "아이유" --limit=50
 */

import "dotenv/config";
import * as ytmusic from "node-youtube-music";

const artistName = process.argv[2];
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number.parseInt(limitArg.split("=")[1]) : 20;

if (!artistName) {
  console.error("❌ 아티스트명을 입력하세요.");
  console.error("사용법: pnpm tsx src/scripts/youtube-music/search-artist-songs.ts \"아이유\"");
  process.exit(1);
}

async function main() {
  console.log(`🔍 아티스트 검색: "${artistName}"\n`);
  console.log("=".repeat(80));

  // 1. 검색 (모든 타입)
  const searchResults = await ytmusic.searchMusics(artistName);

  if (!searchResults || searchResults.length === 0) {
    console.log("❌ 검색 결과가 없습니다.");
    return;
  }

  // 아티스트만 필터링
  const artists = searchResults.filter((item: any) => item.type === "artist");

  if (artists.length === 0) {
    console.log("❌ 아티스트를 찾을 수 없습니다.");
    console.log("\n검색 결과:");
    searchResults.slice(0, 5).forEach((item: any, index: number) => {
      console.log(`${index + 1}. [${item.type}] ${item.title || item.name}`);
    });
    return;
  }

  console.log(`\n📋 검색된 아티스트 목록 (${artists.length}개):\n`);
  artists.slice(0, 5).forEach((artist: any, index: number) => {
    console.log(`${index + 1}. ${artist.name}`);
    console.log(`   Artist ID: ${artist.artistId}`);
    console.log("");
  });

  // 2. 첫 번째 아티스트 선택
  const topArtist = artists[0];
  console.log("=".repeat(80));
  console.log(`\n🎤 선택된 아티스트: ${topArtist.name}`);
  console.log(`   Artist ID: ${topArtist.artistId}\n`);
  console.log("=".repeat(80));

  console.log("\n⏳ 아티스트의 곡 목록 가져오는 중...\n");

  // 3. 아티스트의 곡 목록 가져오기
  const artistData = await ytmusic.getArtist(topArtist.artistId);

  if (!artistData) {
    console.log("⚠️  아티스트 정보를 찾을 수 없습니다.");
    return;
  }

  // 모든 곡 수집 (topReleases, topSongs 등)
  const allSongs: any[] = [];

  if (artistData.topReleases && artistData.topReleases.length > 0) {
    allSongs.push(...artistData.topReleases.filter((item: any) => item.type === "song"));
  }

  if (artistData.songs && artistData.songs.length > 0) {
    allSongs.push(...artistData.songs);
  }

  if (allSongs.length === 0) {
    console.log("⚠️  곡 정보를 찾을 수 없습니다.");
    console.log("\n아티스트 데이터 구조:");
    console.log(JSON.stringify(artistData, null, 2));
    return;
  }

  const songsToShow = allSongs.slice(0, limit);

  console.log(`\n🎵 곡 목록 (${songsToShow.length}/${allSongs.length}개):\n`);
  console.log("=".repeat(80));

  songsToShow.forEach((song: any, index: number) => {
    console.log(`\n${index + 1}. ${song.title || song.name}`);
    console.log(`   Video ID: ${song.youtubeId || song.videoId}`);

    if (song.artists && song.artists.length > 0) {
      const artistNames = song.artists.map((a: any) => a.name).join(", ");
      console.log(`   아티스트: ${artistNames}`);
    } else if (song.artist) {
      console.log(`   아티스트: ${song.artist}`);
    }

    if (song.album) {
      console.log(`   앨범: ${song.album.name || song.album}`);
    }

    if (song.duration) {
      console.log(`   재생시간: ${song.duration}`);
    }
  });

  console.log("\n" + "=".repeat(80));
  console.log(`\n✅ 총 ${allSongs.length}곡 발견`);

  // 4. 앨범 정보
  if (artistData.albums && artistData.albums.length > 0) {
    console.log(`\n💿 앨범 (${artistData.albums.length}개):`);
    artistData.albums.slice(0, 10).forEach((album: any, index: number) => {
      console.log(`   ${index + 1}. ${album.title || album.name} (${album.year || "연도 불명"})`);
    });
  }

  // 5. 싱글 정보
  if (artistData.singles && artistData.singles.length > 0) {
    console.log(`\n💽 싱글 (${artistData.singles.length}개):`);
    artistData.singles.slice(0, 10).forEach((single: any, index: number) => {
      console.log(`   ${index + 1}. ${single.title || single.name} (${single.year || "연도 불명"})`);
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
