import "dotenv/config";
// Usage: cd admin && pnpm ts-node src/scripts/backfill-songs-from-known-tj-artists.ts
// Apply: cd admin && pnpm ts-node src/scripts/backfill-songs-from-known-tj-artists.ts --apply
// 기존 Artist의 name/tjName/nameJa가 tj_song.artist에 포함되는 미생성 TJ 곡을 큐 매니저로 넣는다.

import { ParserService } from "../api/parser/parser.service";
import { PrismaService } from "../prisma/prisma.service";

type KnownArtist = {
  id: number;
  names: string[];
};

type Candidate = {
  tjNumber: string;
  title: string;
  artist: string;
  matchedArtists: KnownArtist[];
};

const shouldApply = process.argv.includes("--apply");
const prisma = new PrismaService();
const parserService = new ParserService(prisma);

async function main() {
  const knownArtists = await getKnownArtists();
  const tjSongs = await prisma.tjSong.findMany({
    where: {
      artist: { not: null },
      song: null,
    },
    select: {
      id: true,
      title: true,
      artist: true,
    },
    orderBy: { id: "asc" },
  });
  const candidates: Candidate[] = [];
  const skippedSamples: Array<{
    tjNumber: string;
    title: string;
    artist: string;
  }> = [];

  for (const tjSong of tjSongs) {
    const artist = tjSong.artist ?? undefined;

    if (!artist) {
      continue;
    }

    const matchedArtists = findMatchedArtists(artist, knownArtists);

    if (matchedArtists.length === 0) {
      if (skippedSamples.length < 20) {
        skippedSamples.push({
          tjNumber: tjSong.id,
          title: tjSong.title,
          artist,
        });
      }

      continue;
    }

    candidates.push({
      tjNumber: tjSong.id,
      title: tjSong.title,
      artist,
      matchedArtists,
    });
  }

  let queued = 0;

  if (shouldApply) {
    for (const candidate of candidates) {
      await parserService.pushRecentSongQueue(candidate.tjNumber);
      queued += 1;
    }
  }

  console.log(`모드: ${shouldApply ? "apply" : "dry-run"}`);
  console.log(`미생성 TJ 곡: ${tjSongs.length}`);
  console.log(`큐 후보: ${candidates.length}`);
  console.log(`큐 추가/갱신: ${queued}`);

  if (candidates.length > 0) {
    console.log("후보 샘플:");

    for (const candidate of candidates.slice(0, 30)) {
      const artistNames = candidate.matchedArtists
        .flatMap((artist) => artist.names)
        .slice(0, 3)
        .join(", ");
      console.log(
        `- ${candidate.tjNumber}: ${candidate.title} / ${candidate.artist} / ${artistNames}`,
      );
    }
  }

  if (skippedSamples.length > 0) {
    console.log("매칭 실패 샘플:");

    for (const sample of skippedSamples) {
      console.log(`- ${sample.tjNumber}: ${sample.title} / ${sample.artist}`);
    }
  }
}

async function getKnownArtists(): Promise<KnownArtist[]> {
  const artists = await prisma.artist.findMany({
    where: {
      homeCatalog: { not: null },
    },
    select: {
      id: true,
      name: true,
      nameJa: true,
      tjName: true,
    },
    orderBy: { id: "asc" },
  });

  return artists
    .map((artist) => ({
      id: artist.id,
      names: Array.from(
        new Set(
          [artist.name, artist.nameJa, artist.tjName]
            .map((name) => name?.trim())
            .filter((name): name is string => Boolean(name && name.length >= 2)),
        ),
      ),
    }))
    .filter((artist) => artist.names.length > 0);
}

function findMatchedArtists(artistText: string, knownArtists: KnownArtist[]) {
  const normalizedArtistText = normalizeName(artistText);

  return knownArtists.filter((artist) =>
    artist.names.some((name) => isArtistMatch(name, normalizedArtistText)),
  );
}

function normalizeName(name: string) {
  return name.replace(/\s/g, "").toLowerCase();
}

function isArtistMatch(name: string, normalizedArtistText: string) {
  const normalizedName = normalizeName(name);

  if (hasCjkOrHangul(normalizedName)) {
    return normalizedArtistText.includes(normalizedName);
  }

  return normalizedArtistText === normalizedName;
}

function hasCjkOrHangul(value: string) {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(value);
}

main()
  .catch((error) => {
    console.error("❌ 오류 발생:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
