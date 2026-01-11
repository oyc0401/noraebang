/**
 * Artist의 Spotify 정보를 가져와서 SpotifyArtist를 생성하고 매핑하는 스크립트
 *
 * 기능:
 * - 지정한 artistId 이후(또는 기본값) Artist들의 Spotify 정보를 Spotify API에서 검색
 * - SpotifyArtist 테이블에 저장 (없으면 생성, 있으면 업데이트)
 * - Artist.spotifyId에 매핑
 *
 * 사용법:
 * npx tsx src/scripts/spotify/fetch-and-link-artists.ts --dry-run
 * npx tsx src/scripts/spotify/fetch-and-link-artists.ts
 * npx tsx src/scripts/spotify/fetch-and-link-artists.ts 312
 *
 * 주의:
 * - SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET 환경변수 필요
 * - Artist 테이블에 spotify_id 컬럼이 있어야 함
 * - Rate limit 고려하여 천천히 실행 (딜레이 추가)
 */

import "dotenv/config";
import { readFile, writeFile } from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DUPLICATE_LOG_PATH = path.resolve(__dirname, "fetch-and-link-artists.json");

type DuplicateLogEntry = {
  id: number;
  name: string;
  spotifyArtistId: string;
  targetId: number;
  targetName: string | null;
};

type DuplicateLog = {
  duplicates: DuplicateLogEntry[];
};

async function loadDuplicateLog(): Promise<DuplicateLog> {
  try {
    const raw = await readFile(DUPLICATE_LOG_PATH, "utf8");
    return JSON.parse(raw) as DuplicateLog;
  } catch {
    return { duplicates: [] };
  }
}

async function saveDuplicateLog(log: DuplicateLog) {
  await writeFile(DUPLICATE_LOG_PATH, `${JSON.stringify(log, null, 2)}\n`, "utf8");
}

async function appendDuplicateLog(entry: DuplicateLogEntry) {
  const log = await loadDuplicateLog();
  const alreadyLogged = log.duplicates.some(
    (dup) => dup.id === entry.id && dup.spotifyArtistId === entry.spotifyArtistId,
  );
  if (!alreadyLogged) {
    log.duplicates.push(entry);
    await saveDuplicateLog(log);
  }
}

// Spotify Access Token 가져오기
async function getSpotifyAccessToken(): Promise<string> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required");
  }

  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Spotify에서 아티스트 검색
async function searchSpotifyArtist(
  artistName: string,
  accessToken: string,
): Promise<any | null> {
  const query = encodeURIComponent(artistName);
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=artist&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  if (!response.ok) {
    console.error(`  ⚠️  Spotify API error: ${response.statusText}`);
    return null;
  }

  const data = await response.json();
  const artist = data.artists?.items?.[0];

  return artist || null;
}

// 딜레이 함수 (Rate limit 방지)
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let startIdArg: number | undefined;
  let isDryRun = false;

  for (const arg of args) {
    if (arg === "--dry-run") {
      isDryRun = true;
      continue;
    }

    if (arg.startsWith("--start=")) {
      const parsed = Number.parseInt(arg.split("=")[1], 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error("유효한 start ID를 입력해주세요.");
      }
      startIdArg = parsed;
      continue;
    }

    if (!arg.startsWith("--") && startIdArg === undefined) {
      const parsed = Number.parseInt(arg, 10);
      if (Number.isNaN(parsed) || parsed <= 0) {
        throw new Error("숫자로 된 artist ID를 입력해주세요.");
      }
      startIdArg = parsed;
      continue;
    }
  }

  console.log(
    `\n=== Spotify Artist 생성 및 매핑 ${isDryRun ? "(DRY RUN)" : ""} ===\n`,
  );

  // 1. Spotify Access Token 가져오기
  console.log("Step 1: Getting Spotify access token...");
  const accessToken = await getSpotifyAccessToken();
  console.log("✓ Access token acquired\n");

  // 2. 시작 artistId 결정 (기본: Spotify 정보가 없는 가장 낮은 ID)
  let startId: number;
  if (typeof startIdArg === "number") {
    startId = startIdArg;
    console.log(`Step 2: ID ${startId}부터 조회합니다.`);
  } else {
    const firstWithoutSpotify = await prisma.artist.findFirst({
      where: { spotifyId: null },
      orderBy: { id: "asc" },
      select: { id: true },
    });
    startId = firstWithoutSpotify?.id ?? 1;
    console.log(
      `Step 2: Spotify 미연결 아티스트 중 ID ${startId}부터 시작합니다.`,
    );
  }

  // 3. 대상 Artist 가져오기
  const artists = await prisma.artist.findMany({
    where: {
      id: {
        gte: startId,
      },
    },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  console.log(`✓ Found ${artists.length} artists\n`);

  // 4. 각 아티스트에 대해 Spotify 검색 및 저장
  console.log("Step 4: Searching and linking Spotify artists...");

  let createdCount = 0;
  const updatedCount = 0;
  let alreadyLinkedCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;
  const notFoundArtists: string[] = [];

  for (let i = 0; i < artists.length; i++) {
    const artist = artists[i];

    // 이미 spotifyId가 설정되어 있으면 스킵
    if (artist.spotifyId) {
      alreadyLinkedCount++;
      console.log(
        `  [${i + 1}/${artists.length}] [${artist.id}] ${artist.name} - Already linked`,
      );
      continue;
    }

    try {
      // Spotify에서 검색
      const spotifyArtist = await searchSpotifyArtist(artist.name, accessToken);

      if (!spotifyArtist) {
        notFoundCount++;
        notFoundArtists.push(
          `[${artist.id}] ${artist.name} (${artist.nameKo})`,
        );
        console.log(
          `  [${i + 1}/${artists.length}] [${artist.id}] ${artist.name} - Not found`,
        );
        continue;
      }

      const thumbnails = (spotifyArtist.images || [])
        .map((img: any) => img.url)
        .filter((url: string) => url);

      const spotifyData = {
        spotifyId: spotifyArtist.id,
        spotifyUrl: spotifyArtist.external_urls?.spotify,
        name: spotifyArtist.name,
        popularity: spotifyArtist.popularity,
        followers: spotifyArtist.followers?.total,
        genres: spotifyArtist.genres || [],
        thumbnails,
      };

      const targetArtist = await prisma.artist.findFirst({
        where: {
          spotifyId: spotifyData.spotifyId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (targetArtist && targetArtist.id !== artist.id) {
        console.warn(
          `  [${i + 1}/${artists.length}] ⚠️  [${artist.id}] ${artist.name} - Duplicate Spotify ID (already linked to artist ${targetArtist.id} ${targetArtist.name ?? ""})`,
        );
        await appendDuplicateLog({
          id: artist.id,
          name: artist.name,
          spotifyArtistId: spotifyData.spotifyId,
          targetId: targetArtist.id,
          targetName: targetArtist.name ?? null,
        });
        continue;
      }

      if (!isDryRun) {
        // SpotifyArtist 생성 또는 업데이트
        await prisma.spotifyArtist.upsert({
          where: { spotifyId: spotifyData.spotifyId },
          create: spotifyData,
          update: spotifyData,
        });

        // Artist.spotifyId 업데이트
        await prisma.artist.update({
          where: { id: artist.id },
          data: { spotifyId: spotifyData.spotifyId },
        });

        createdCount++;
      } else {
        createdCount++;
      }

      console.log(
        `  [${i + 1}/${artists.length}] ✓ [${artist.id}] ${artist.name} → ${spotifyData.spotifyId} (${spotifyData.name})`,
      );

      // Rate limit 방지 (100ms 딜레이)
      await delay(100);
    } catch (error) {
      errorCount++;
      console.error(
        `  [${i + 1}/${artists.length}] ❌ [${artist.id}] ${artist.name} - Error: ${error}`,
      );
    }
  }

  // 결과 출력
  console.log(`\n=== 결과 ===`);
  console.log(`✅ 생성/업데이트 완료: ${createdCount}개`);
  console.log(`ℹ️  이미 연결됨: ${alreadyLinkedCount}개`);
  console.log(`⚠️  Spotify에서 찾지 못함: ${notFoundCount}개`);
  console.log(`❌ 오류 발생: ${errorCount}개`);

  if (notFoundArtists.length > 0) {
    console.log(`\n📋 Spotify에서 찾지 못한 아티스트 (최대 20개):`);
    notFoundArtists.slice(0, 20).forEach((artist) => {
      console.log(`  - ${artist}`);
    });
    if (notFoundArtists.length > 20) {
      console.log(`  ... 외 ${notFoundArtists.length - 20}개`);
    }
  }

  if (isDryRun) {
    console.log(
      `\n💡 실제 업데이트를 수행하려면 --dry-run 없이 다시 실행하세요.`,
    );
  } else {
    console.log(`\n✅ 동기화 완료!`);
  }
}

main()
  .catch((error) => {
    console.error("\n❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
