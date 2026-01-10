/**
 * Song별로 SpotifyTrackGroup을 생성하고 관련 SpotifyTrack들을 연결하는 스크립트
 *
 * 동작:
 * 1. Song의 아티스트들로부터 SpotifyTrack 후보들을 찾음
 * 2. Song별로 SpotifyTrackGroup 생성 (titleKo, titleJaKana, titleJaKanji, titleLatin 복사)
 * 3. 해당 Song의 제목과 유사한 SpotifyTrack들을 그룹에 연결
 * 4. popularity가 가장 높은 트랙을 primarySpotifyTrackId로 설정
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/create-spotify-track-groups.ts --dry-run
 * pnpm ts-node src/scripts/spotify/create-spotify-track-groups.ts
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type TrackInfo = {
  id: number;
  spotifyId: string;
  name: string;
  musicBrainzTitle: string | null;
  popularity: number | null;
  disabled: boolean;
  groupId: number | null;
};

type SongInfo = {
  id: number;
  title: string;
  titleKo: string | null;
  titleLatin: string | null;
  titleJaKana: string | null;
  titleJaKanji: string | null;
  artistIds: number[];
};

function popularityScore(p: number | null | undefined): number {
  return typeof p === "number" ? p : -1;
}

function pickPrimaryTrack(tracks: TrackInfo[]): TrackInfo {
  // popularity desc, id asc (tie-break)
  return tracks.slice().sort((a, b) => {
    const pa = popularityScore(a.popularity);
    const pb = popularityScore(b.popularity);
    if (pa !== pb) return pb - pa;
    return a.id - b.id;
  })[0]!;
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[\s\-_()[\]{}]/g, "")
    .trim();
}

function isTitleMatch(songTitle: string, trackTitle: string): boolean {
  const normalized1 = normalizeTitle(songTitle);
  const normalized2 = normalizeTitle(trackTitle);
  return normalized1 === normalized2;
}

async function main() {
  const isDryRun = process.argv.includes("--dry-run");

  console.log(
    `\n=== SpotifyTrackGroup 생성 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1) 모든 Song 조회
  console.log("Step 1: Song 조회 중...");
  const songs = await prisma.song.findMany({
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJaKana: true,
      titleJaKanji: true,
      artistSongs: {
        select: {
          artistId: true,
        },
      },
      spotifyTrackGroup: {
        select: { id: true },
      },
    },
    orderBy: { id: "asc" },
  });

  console.log(`✓ 총 ${songs.length}개 Song 발견\n`);

  // SpotifyTrackGroup이 이미 있는 Song 제외
  const songsToProcess: SongInfo[] = [];
  let skippedCount = 0;

  for (const song of songs) {
    if (song.spotifyTrackGroup) {
      skippedCount++;
      continue;
    }

    songsToProcess.push({
      id: song.id,
      title: song.title,
      titleKo: song.titleKo,
      titleLatin: song.titleLatin,
      titleJaKana: song.titleJaKana,
      titleJaKanji: song.titleJaKanji,
      artistIds: song.artistSongs.map((as) => as.artistId),
    });
  }

  console.log(`✓ 처리 대상: ${songsToProcess.length}개`);
  console.log(`✓ 이미 그룹 존재: ${skippedCount}개\n`);

  if (songsToProcess.length === 0) {
    console.log("✅ 처리할 Song이 없습니다. 종료합니다.");
    return;
  }

  // 2) 모든 Artist의 spotifyId 조회
  console.log("Step 2: Artist → SpotifyArtist 매핑 조회 중...");
  const allArtistIds = [
    ...new Set(songsToProcess.flatMap((s) => s.artistIds)),
  ];
  const artists = await prisma.artist.findMany({
    where: { id: { in: allArtistIds } },
    select: { id: true, spotifyId: true },
  });

  const artistIdToSpotifyId = new Map<number, string>();
  for (const a of artists) {
    if (a.spotifyId) artistIdToSpotifyId.set(a.id, a.spotifyId);
  }

  const spotifyIds = [...new Set(artistIdToSpotifyId.values())];
  console.log(
    `✓ SpotifyId 보유 아티스트: ${artistIdToSpotifyId.size}명 (unique spotifyId: ${spotifyIds.length})\n`,
  );

  // 3) SpotifyArtist 조회
  console.log("Step 3: SpotifyArtist 조회 중...");
  const spotifyArtists = await prisma.spotifyArtist.findMany({
    where: { spotifyId: { in: spotifyIds } },
    select: { id: true, spotifyId: true },
  });

  const spotifyIdToSpotifyArtistId = new Map<string, number>();
  for (const sa of spotifyArtists) {
    spotifyIdToSpotifyArtistId.set(sa.spotifyId, sa.id);
  }

  console.log(`✓ SpotifyArtist: ${spotifyArtists.length}개\n`);

  // 4) 모든 SpotifyTrack 조회 (한 번에)
  console.log("Step 4: SpotifyTrack 조회 중...");
  const targetSpotifyArtistIds = [...spotifyIdToSpotifyArtistId.values()];

  const tracks = await prisma.spotifyArtistTrack.findMany({
    where: {
      spotifyArtistId: { in: targetSpotifyArtistIds },
      spotifyTrack: {
        disabled: false,
      },
    },
    select: {
      spotifyArtistId: true,
      spotifyTrack: {
        select: {
          id: true,
          spotifyId: true,
          name: true,
          musicBrainzTitle: true,
          popularity: true,
          disabled: true,
          groupId: true,
        },
      },
    },
  });

  console.log(`✓ SpotifyTrack 링크: ${tracks.length}개\n`);

  // SpotifyArtistId → Tracks 매핑
  const tracksBySpotifyArtistId = new Map<number, TrackInfo[]>();
  for (const link of tracks) {
    const arr = tracksBySpotifyArtistId.get(link.spotifyArtistId) ?? [];
    arr.push(link.spotifyTrack);
    tracksBySpotifyArtistId.set(link.spotifyArtistId, arr);
  }

  // 5) Song별로 매칭되는 트랙 찾기 및 그룹 생성
  console.log("Step 5: Song별 SpotifyTrackGroup 생성 중...\n");

  let createdGroups = 0;
  let noMatchCount = 0;
  const samples: Array<{
    songId: number;
    songTitle: string;
    groupId: number;
    primaryTrackId: number;
    trackCount: number;
  }> = [];

  for (const song of songsToProcess) {
    // 이 Song의 아티스트들이 가진 SpotifyTrack 후보들
    const candidateTracks: TrackInfo[] = [];

    for (const artistId of song.artistIds) {
      const spotifyId = artistIdToSpotifyId.get(artistId);
      if (!spotifyId) continue;

      const spotifyArtistId = spotifyIdToSpotifyArtistId.get(spotifyId);
      if (!spotifyArtistId) continue;

      const artistTracks = tracksBySpotifyArtistId.get(spotifyArtistId) ?? [];
      candidateTracks.push(...artistTracks);
    }

    // 중복 제거
    const uniqueTracks = Array.from(
      new Map(candidateTracks.map((t) => [t.id, t])).values(),
    );

    // Song 제목과 매칭되는 트랙들 찾기
    const matchedTracks = uniqueTracks.filter((t) => {
      // Song의 모든 제목 버전과 비교
      const songTitles = [
        song.title,
        song.titleKo,
        song.titleLatin,
        song.titleJaKana,
        song.titleJaKanji,
      ].filter(Boolean) as string[];

      const trackTitles = [t.name, t.musicBrainzTitle].filter(
        Boolean,
      ) as string[];

      for (const st of songTitles) {
        for (const tt of trackTitles) {
          if (isTitleMatch(st, tt)) return true;
        }
      }

      return false;
    });

    if (matchedTracks.length === 0) {
      noMatchCount++;
      continue;
    }

    // 대표 트랙 선정
    const primaryTrack = pickPrimaryTrack(matchedTracks);

    if (isDryRun) {
      if (samples.length < 10) {
        samples.push({
          songId: song.id,
          songTitle: song.title,
          groupId: -1, // dry-run이라 생성 안함
          primaryTrackId: primaryTrack.id,
          trackCount: matchedTracks.length,
        });
      }
      createdGroups++;
      continue;
    }

    // SpotifyTrackGroup 생성
    const group = await prisma.spotifyTrackGroup.create({
      data: {
        songId: song.id,
        primarySpotifyTrackId: primaryTrack.id,
        titleKo: song.titleKo,
        titleLatin: song.titleLatin,
        titleJaKana: song.titleJaKana,
        titleJaKanji: song.titleJaKanji,
      },
    });

    // 매칭된 트랙들을 그룹에 연결
    await prisma.spotifyTrack.updateMany({
      where: { id: { in: matchedTracks.map((t) => t.id) } },
      data: { groupId: group.id },
    });

    if (samples.length < 10) {
      samples.push({
        songId: song.id,
        songTitle: song.title,
        groupId: group.id,
        primaryTrackId: primaryTrack.id,
        trackCount: matchedTracks.length,
      });
    }

    createdGroups++;

    if (createdGroups % 100 === 0) {
      console.log(`  진행: ${createdGroups}개 그룹 생성...`);
    }
  }

  console.log("\n=== 통계 ===");
  console.log(`📦 처리 대상 Song: ${songsToProcess.length}`);
  console.log(`✅ SpotifyTrackGroup 생성: ${createdGroups}`);
  console.log(`⚠️  매칭 트랙 없음: ${noMatchCount}`);

  if (samples.length > 0) {
    console.log("\n=== 샘플 (처음 10개) ===");
    for (const s of samples) {
      console.log(
        `Song[${s.songId}] "${s.songTitle}" → Group[${s.groupId}] primary=${s.primaryTrackId} tracks=${s.trackCount}`,
      );
    }
  }

  if (isDryRun) {
    console.log("\n💡 DRY RUN: 실제 DB 업데이트는 수행하지 않습니다.");
    return;
  }

  console.log("\n✅ 완료: SpotifyTrackGroup 생성 및 트랙 연결 완료!");
}

main()
  .catch((error) => {
    console.error("\n❌ 스크립트 실행 중 오류:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
