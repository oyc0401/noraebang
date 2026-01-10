/**
 * artist-songs.json을 기반으로 Song(TJ)과 SpotifyTrack 매칭 JSON 생성
 *
 * 매칭 로직:
 * - song.title (일본어) ↔ spotifyTrack.musicBrainzTitle (일본어) 유사도
 * - Levenshtein distance 기반
 * - Spotify 트랙 1개당 여러 Song 매칭 가능 (MV/MR 버전)
 *
 * 출력:
 * {
 *   "spotifyTrackId": 123,
 *   "songIds": [456, 789],
 *   "confidence": 0.95,
 *   "details": [...]
 * }
 *
 * 사용법:
 * pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts artist-songs.json
 * pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts artist-songs.json --min-confidence 0.8
 */

import fs from "node:fs";

interface ArtistSongsJson {
  artist: {
    id: number;
    name: string;
    nameKo: string;
    spotifyId: string | null;
  };
  songs: Array<{
    id: number;
    title: string;
    titleKo: string | null;
  }>;
  spotifyTracks: Array<{
    id: number;
    title: string;
    spotifyId: string;
    isrc: string | null;
    durationMs: number;
    musicBrainzTitle?: string;
  }>;
}

interface SongMatch {
  songId: number;
  songTitle: string;
  similarity: number;
}

interface MappingResult {
  spotifyTrackId: number;
  spotifyTrackTitle: string;
  musicBrainzTitle: string | null;
  matches: SongMatch[];
  bestMatch: SongMatch | null;
}

/**
 * Levenshtein distance
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * 문자열 유사도 (0~1)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1.0;

  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  return maxLength === 0 ? 1 : 1 - distance / maxLength;
}

/**
 * Spotify 트랙마다 유사한 Song들 찾기
 */
function generateMapping(
  data: ArtistSongsJson,
  minConfidence: number,
): MappingResult[] {
  const results: MappingResult[] = [];

  for (const track of data.spotifyTracks) {
    const matches: SongMatch[] = [];

    for (const song of data.songs) {
      // 여러 조합 중 최대 유사도 사용
      let maxSimilarity = 0;

      // 1. song.title ↔ track.musicBrainzTitle (일본어 ↔ 일본어)
      if (track.musicBrainzTitle) {
        maxSimilarity = Math.max(
          maxSimilarity,
          similarity(song.title, track.musicBrainzTitle),
        );
      }

      // 2. song.title ↔ track.title (일본어 ↔ 영어/로마자)
      maxSimilarity = Math.max(maxSimilarity, similarity(song.title, track.title));

      // 3. song.titleKo ↔ track.title (한국어 ↔ 영어/로마자)
      if (song.titleKo) {
        maxSimilarity = Math.max(
          maxSimilarity,
          similarity(song.titleKo, track.title),
        );
      }

      // 4. song.titleKo ↔ track.musicBrainzTitle (한국어 ↔ 일본어)
      if (song.titleKo && track.musicBrainzTitle) {
        maxSimilarity = Math.max(
          maxSimilarity,
          similarity(song.titleKo, track.musicBrainzTitle),
        );
      }

      if (maxSimilarity >= minConfidence) {
        matches.push({
          songId: song.id,
          songTitle: song.title,
          similarity: maxSimilarity,
        });
      }
    }

    // 유사도 높은 순 정렬
    matches.sort((a, b) => b.similarity - a.similarity);

    results.push({
      spotifyTrackId: track.id,
      spotifyTrackTitle: track.title,
      musicBrainzTitle: track.musicBrainzTitle || null,
      matches,
      bestMatch: matches.length > 0 ? matches[0] : null,
    });
  }

  return results;
}

function main() {
  const args = process.argv.slice(2);
  const jsonPath = args.find((arg) => !arg.startsWith("--"));
  const minConfidenceArg = args.find((arg) => arg.startsWith("--min-confidence"));
  const minConfidence = minConfidenceArg
    ? Number.parseFloat(minConfidenceArg.split("=")[1])
    : 0.7;

  if (!jsonPath) {
    console.error(
      "❌ Usage: pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts <jsonPath> [--min-confidence=0.7]",
    );
    console.error(
      "   Example: pnpm ts-node src/scripts/spotify/generate-song-spotify-mapping.ts artist-songs.json",
    );
    process.exit(1);
  }

  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  console.log(`\n📂 Reading ${jsonPath}...\n`);
  const data: ArtistSongsJson = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

  console.log(`🎵 Artist: ${data.artist.name} (${data.artist.nameKo})`);
  console.log(`📊 Songs: ${data.songs.length}`);
  console.log(`📀 Spotify Tracks: ${data.spotifyTracks.length}`);
  console.log(`🎯 Min Confidence: ${minConfidence}\n`);

  // 매칭 생성
  console.log("🔍 Generating mappings...\n");
  const mappings = generateMapping(data, minConfidence);

  // 통계
  const withMatches = mappings.filter((m) => m.matches.length > 0);
  const withoutMatches = mappings.filter((m) => m.matches.length === 0);
  const perfectMatches = mappings.filter(
    (m) => m.bestMatch && m.bestMatch.similarity === 1.0,
  );

  console.log("=".repeat(70));
  console.log("📊 Statistics:");
  console.log(`  ✅ Spotify tracks with matches: ${withMatches.length}`);
  console.log(`  🎯 Perfect matches (100%): ${perfectMatches.length}`);
  console.log(`  ❌ Spotify tracks without matches: ${withoutMatches.length}`);
  console.log("=".repeat(70) + "\n");

  // 샘플 출력 (매칭된 것들)
  console.log("✅ Sample mappings (first 10 with matches):");
  withMatches.slice(0, 10).forEach((m, i) => {
    console.log(
      `\n${i + 1}. Spotify: "${m.spotifyTrackTitle}" (ID: ${m.spotifyTrackId})`,
    );
    if (m.musicBrainzTitle) {
      console.log(`   MusicBrainz: "${m.musicBrainzTitle}"`);
    }
    console.log(`   Matched Songs (${m.matches.length}):`);
    m.matches.slice(0, 3).forEach((match, j) => {
      console.log(
        `     ${j + 1}. "${match.songTitle}" (ID: ${match.songId}) - ${(match.similarity * 100).toFixed(1)}%`,
      );
    });
    if (m.matches.length > 3) {
      console.log(`     ... and ${m.matches.length - 3} more`);
    }
  });

  // 매칭 안된 것 샘플
  if (withoutMatches.length > 0) {
    console.log("\n\n❌ Sample without matches (first 5):");
    withoutMatches.slice(0, 5).forEach((m, i) => {
      console.log(
        `${i + 1}. "${m.spotifyTrackTitle}" ${m.musicBrainzTitle ? `(MB: "${m.musicBrainzTitle}")` : ""}`,
      );
    });
  }

  // JSON 저장
  const outputPath = jsonPath.replace(".json", "-mapping.json");
  fs.writeFileSync(outputPath, JSON.stringify(mappings, null, 2));
  console.log(`\n💾 Saved mapping to ${outputPath}`);

  // 간단한 통계 파일도 저장
  const statsPath = jsonPath.replace(".json", "-mapping-stats.json");
  fs.writeFileSync(
    statsPath,
    JSON.stringify(
      {
        artist: data.artist,
        totalSongs: data.songs.length,
        totalSpotifyTracks: data.spotifyTracks.length,
        minConfidence,
        stats: {
          tracksWithMatches: withMatches.length,
          tracksWithoutMatches: withoutMatches.length,
          perfectMatches: perfectMatches.length,
          totalMappings: withMatches.reduce(
            (sum, m) => sum + m.matches.length,
            0,
          ),
        },
      },
      null,
      2,
    ),
  );
  console.log(`📊 Saved stats to ${statsPath}\n`);
}

main();
