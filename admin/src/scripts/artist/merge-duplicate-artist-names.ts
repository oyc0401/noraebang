/**
 * Artist.name이 대소문자만 다르게 중복된 경우를 자동 병합하는 스크립트
 * (띄어쓰기가 다르면 다른 가수로 취급)
 *
 * pnpm ts-node src/scripts/artist/merge-duplicate-artist-names.ts
 * pnpm ts-node src/scripts/artist/merge-duplicate-artist-names.ts --merge
 * pnpm ts-node src/scripts/artist/merge-duplicate-artist-names.ts --merge --name="kinki kids"
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const shouldMerge = process.argv.includes("--merge");
const nameArg = process.argv.find((arg) => arg.startsWith("--name="));
const filterNames = nameArg
  ? new Set(
      nameArg
        .split("=")[1]
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name.length > 0),
    )
  : undefined;
const excludedNames = new Set<string>();
const forcedTargetNames: Record<string, string> = {
  lisa: "리사",
};

type DuplicateArtistRow = {
  normalized_name: string;
  duplicate_count: bigint | number | string;
  artists: Prisma.JsonValue;
};

type DuplicateArtist = {
  normalizedName: string;
  duplicateCount: number;
  artists: Array<{
    id: number;
    name: string;
    nameKo: string | null;
  }>;
};

function parseArtists(value: Prisma.JsonValue): DuplicateArtist["artists"] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const idValue = record.id;
      const nameValue = record.name;
      const nameKoValue = record.nameKo;

      const id =
        typeof idValue === "number"
          ? idValue
          : typeof idValue === "string"
            ? Number.parseInt(idValue, 10)
            : null;
      const name = typeof nameValue === "string" ? nameValue : null;
      const nameKo =
        typeof nameKoValue === "string" && nameKoValue.length > 0
          ? nameKoValue
          : null;

      if (id === null || !name) return null;

      return { id, name, nameKo };
    })
    .filter(
      (artist): artist is DuplicateArtist["artists"][number] => artist !== null,
    );
}

function toNumber(value: DuplicateArtistRow["duplicate_count"]) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number.parseInt(value, 10);
  return 0;
}

async function fetchDuplicateGroups() {
  const rows = await prisma.$queryRaw<DuplicateArtistRow[]>`
    WITH normalized_names AS (
      SELECT
        id,
        name,
        name_ko,
        LOWER(name) AS normalized_name
      FROM artist
      WHERE name IS NOT NULL
    )
    SELECT
      normalized_name,
      COUNT(*) AS duplicate_count,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', id,
          'name', name,
          'nameKo', name_ko
        )
        ORDER BY id
      ) AS artists
    FROM normalized_names
    GROUP BY normalized_name
    HAVING COUNT(*) > 1
    ORDER BY normalized_name ASC
  `;

  let duplicates: DuplicateArtist[] = rows.map((row) => ({
    normalizedName: row.normalized_name,
    duplicateCount: toNumber(row.duplicate_count),
    artists: parseArtists(row.artists),
  }));

  if (filterNames) {
    duplicates = duplicates.filter((group) =>
      filterNames.has(group.normalizedName),
    );
  }

  return duplicates.filter((group) => !excludedNames.has(group.normalizedName));
}

async function mergeArtistIds(
  fromArtist: DuplicateArtist["artists"][number],
  toArtist: DuplicateArtist["artists"][number],
) {
  await prisma.$transaction(async (tx) => {
    const songs = await tx.artistSong.findMany({
      where: { artistId: fromArtist.id },
      select: {
        songId: true,

        role: true,
      },
    });

    let copiedCount = 0;
    let skippedCount = 0;

    if (songs.length > 0) {
      const createManyResult = await tx.artistSong.createMany({
        data: songs.map((song) => ({
          artistId: toArtist.id,
          songId: song.songId,
          order: song.order,
          role: song.role,
        })),
        skipDuplicates: true,
      });

      copiedCount = createManyResult.count;
      skippedCount = songs.length - createManyResult.count;
    }

    await tx.artistSong.deleteMany({
      where: { artistId: fromArtist.id },
    });

    await tx.artist.delete({
      where: { id: fromArtist.id },
    });

    console.log(
      `      ✅ [${fromArtist.id}] → [${toArtist.id}] 병합 완료 (복사: ${copiedCount}곡, 스킵: ${skippedCount}곡)`,
    );
  });
}

async function main() {
  console.log("🔍 Artist.name 대소문자 중복 그룹 조회 중...");
  if (!shouldMerge) {
    console.log("ℹ️  --merge 옵션을 주지 않으면 조회만 수행합니다.\n");
  } else {
    console.log("⚠️  --merge 옵션 활성화: 실 데이터가 변경됩니다!\n");
  }

  if (filterNames && filterNames.size > 0) {
    console.log(
      `🎯 대상 이름: ${Array.from(filterNames)
        .map((name) => `"${name}"`)
        .join(", ")}`,
    );
  }

  if (excludedNames.size > 0) {
    console.log(
      `🚫 병합 제외 대상: ${Array.from(excludedNames)
        .map((name) => `"${name}"`)
        .join(", ")}`,
    );
  }
  if (Object.keys(forcedTargetNames).length > 0) {
    console.log(
      `🎯 강제 기준 대상: ${Object.entries(forcedTargetNames)
        .map(([normalized, name]) => `"${normalized}"→"${name}"`)
        .join(", ")}`,
    );
  }

  const duplicateGroups = await fetchDuplicateGroups();

  if (duplicateGroups.length === 0) {
    console.log("✅ 중복 그룹이 없습니다.");
    return;
  }

  console.log(
    `⚠️ ${duplicateGroups.length}개의 Artist.name 그룹에서 중복이 발견되었습니다.\n`,
  );

  for (const group of duplicateGroups) {
    const sorted = [...group.artists].sort((a, b) => a.id - b.id);
    const forcedName = forcedTargetNames[group.normalizedName];
    let target = sorted[0];

    if (forcedName) {
      const forcedTarget =
        sorted.find((artist) => artist.name === forcedName) ??
        sorted.find((artist) => artist.nameKo === forcedName);

      if (forcedTarget) {
        target = forcedTarget;
      } else {
        console.warn(
          `⚠️  "${group.normalizedName}" 강제 병합 대상 "${forcedName}"을 찾을 수 없습니다. 기본 규칙을 사용합니다.`,
        );
      }
    }

    const duplicates = sorted.filter((artist) => artist.id !== target.id);

    console.log(
      `• "${group.normalizedName}" (${group.duplicateCount}명) → 기준 Artist ID: ${target.id}`,
    );
    console.log(
      `   - 기준: [${target.id}] ${target.name}${target.nameKo ? ` / ${target.nameKo}` : ""}`,
    );
    duplicates.forEach((artist) => {
      console.log(
        `   - 병합: [${artist.id}] ${artist.name}${
          artist.nameKo ? ` / ${artist.nameKo}` : ""
        }`,
      );
    });

    if (!shouldMerge || duplicates.length === 0) {
      console.log("");
      continue;
    }

    for (const artist of duplicates) {
      try {
        await mergeArtistIds(artist, target);
      } catch (error) {
        console.error(
          `      ❌ [${artist.id}] → [${target.id}] 병합 실패`,
          error,
        );
        throw error;
      }
    }

    console.log("");
  }

  if (!shouldMerge) {
    console.log("ℹ️  실제 병합을 실행하려면 --merge 옵션을 추가로 지정하세요.");
  } else {
    console.log("✅ 모든 중복 Artist 병합이 완료되었습니다.");
  }
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
