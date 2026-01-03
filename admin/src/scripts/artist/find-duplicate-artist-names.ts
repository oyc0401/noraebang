/**
 * Artist.name이 대소문자만 다른 경우를 찾아내는 스크립트
 * (띄어쓰기가 다르면 다른 가수로 취급)
 *
 * pnpm ts-node src/scripts/artist/find-duplicate-artist-names.ts
 * pnpm ts-node src/scripts/artist/find-duplicate-artist-names.ts --output=admin/data/duplicate-artist-names.json
 */

import "dotenv/config";
import * as fs from "node:fs";
import * as path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { type Prisma, PrismaClient } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const outputArg = process.argv.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? outputArg.split("=")[1] : undefined;

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

async function findDuplicateArtistNames() {
  console.log("🔍 Artist.name 대소문자 무시 완전일치 기준으로 중복 검사 중...");

  try {
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
      ORDER BY duplicate_count DESC, normalized_name ASC
    `;

    const duplicates: DuplicateArtist[] = rows.map((row) => ({
      normalizedName: row.normalized_name,
      duplicateCount: toNumber(row.duplicate_count),
      artists: parseArtists(row.artists),
    }));

    if (duplicates.length === 0) {
      console.log("✅ 중복된 Artist.name이 없습니다.");
    } else {
      console.log(
        `⚠️ ${duplicates.length}개의 Artist.name이 대소문자만 다르게 중복되어 있습니다.`,
      );
      console.log("");

      duplicates.forEach((duplicate, index) => {
        console.log(
          `${(index + 1).toString().padStart(3, " ")}. "${duplicate.normalizedName}" (${duplicate.duplicateCount}개)`,
        );
        duplicate.artists.forEach((artist) => {
          const ko = artist.nameKo ? ` / ${artist.nameKo}` : "";
          console.log(`       - [${artist.id}] ${artist.name}${ko}`);
        });
        console.log("");
      });
    }

    if (outputPath) {
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(
        outputPath,
        JSON.stringify(duplicates, null, 2),
        "utf-8",
      );
      console.log(`💾 결과 저장 완료: ${outputPath}`);
    }
  } catch (error) {
    console.error("❌ 중복 검사 중 오류가 발생했습니다.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

void findDuplicateArtistNames();
