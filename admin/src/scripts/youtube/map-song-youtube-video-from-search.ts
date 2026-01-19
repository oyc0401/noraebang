/**
 * searchUnlinkedSongYoutube 결과를 활용해 Song ←→ YoutubeVideo 자동 매핑
 *
 * 동작 요약:
 * 1) artistId의 미연결 Song을 YouTube에서 검색 (title + artist name)
 * 2) 각 Song별 첫 번째 검색 결과 타이틀을 기준으로 아티스트 소속 미매칭 영상과 비교
 * 3) normalize된 타이틀 일치 → findMatch 순으로 가장 적절한 영상과 연결
 *
 * 사용법:
 * pnpm tsx src/scripts/youtube/map-song-youtube-video-from-search.ts <artistId>
 * pnpm tsx src/scripts/youtube/map-song-youtube-video-from-search.ts <artistId> --dry-run
 * 옵션:
 *   --max-results-per-song <n>
 *   --max-songs <n>
 *   --region <CODE>
 *   --lang <CODE>
 *   --music-only
 */

import "dotenv/config";
import { prisma } from "../../lib/prisma.ts";
import {
  mapSongYoutubeVideoFromSearch,
  type MapSongYoutubeVideoFromSearchOptions,
} from "../../lib/admin/map-song-youtube-video-from-search.ts";

type ParsedArgs = {
  artistId: number;
  options: MapSongYoutubeVideoFromSearchOptions;
};

const USAGE = `
Usage: pnpm tsx src/scripts/youtube/map-song-youtube-video-from-search.ts <artistId> [options]

Options:
  --dry-run                 실제 매핑 저장 대신 로그만 출력
  --max-results-per-song n  Song당 검색 결과 최대 개수 (기본 search 함수 값)
  --max-songs n             처리할 Song 최대 개수
  --region CODE             YouTube 검색 regionCode
  --lang CODE               YouTube 검색 relevanceLanguage
  --music-only              음악 카테고리 영상만 필터
`.trim();

function parseArgs(argv: string[]): ParsedArgs {
  const artistArg = argv.find((arg) => /^\d+$/.test(arg));
  if (!artistArg) {
    console.error("❌ artistId가 필요합니다.\n");
    console.log(USAGE);
    process.exit(1);
  }

  const artistId = Number.parseInt(artistArg, 10);
  if (Number.isNaN(artistId)) {
    console.error(`❌ 잘못된 artistId: ${artistArg}`);
    process.exit(1);
  }

  const options: MapSongYoutubeVideoFromSearchOptions = {
    dryRun: argv.includes("--dry-run"),
  };

  const maxResults = readNumberFlag(argv, "--max-results-per-song");
  if (typeof maxResults === "number") {
    options.maxResultsPerSong = maxResults;
  }

  const maxSongs = readNumberFlag(argv, "--max-songs");
  if (typeof maxSongs === "number") {
    options.maxSongs = maxSongs;
  }

  const regionCode = readStringFlag(argv, "--region");
  if (regionCode) {
    options.regionCode = regionCode;
  }

  const relevanceLanguage = readStringFlag(argv, "--lang");
  if (relevanceLanguage) {
    options.relevanceLanguage = relevanceLanguage;
  }

  if (argv.includes("--music-only")) {
    options.filterToMusicCategory = true;
  }

  return { artistId, options };
}

function readNumberFlag(argv: string[], name: string): number | undefined {
  const raw = readStringFlag(argv, name);
  if (raw == null) return undefined;
  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    console.warn(`⚠️ ${name} 값 "${raw}" 을 숫자로 해석할 수 없습니다. 무시합니다.`);
    return undefined;
  }
  return parsed;
}

function readStringFlag(argv: string[], name: string): string | undefined {
  const prefix = `${name}=`;
  const match = argv.find((arg) => arg.startsWith(prefix));
  if (match) {
    const value = match.slice(prefix.length).trim();
    return value || undefined;
  }

  const idx = argv.indexOf(name);
  if (idx >= 0 && argv[idx + 1] && !argv[idx + 1].startsWith("--")) {
    return argv[idx + 1];
  }

  return undefined;
}

async function main() {
  const { artistId, options } = parseArgs(process.argv.slice(2));

  console.log(
    `🚀 map-song-youtube-video-from-search: artistId=${artistId} ${
      options.dryRun ? "(dry-run)" : ""
    }`,
  );

  await mapSongYoutubeVideoFromSearch(artistId, options);
}

main()
  .catch((error) => {
    console.error("❌ 스크립트 실패:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
