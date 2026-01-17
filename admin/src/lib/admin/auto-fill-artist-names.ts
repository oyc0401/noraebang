import { isKana } from "wanakana";

import { prisma } from "../prisma";

// autoFillArtistNames는 Spotify/토픽 채널 이름을 활용해 아티스트의 언어별 이름 필드를 자동 보완합니다.

type ArtistNameField = "nameLatin" | "nameJaKanji" | "nameJaKana" | "nameKo";

type ArtistRecord = {
  id: number;
  name: string;
  nameKo: string | null;
  nameLatin: string | null;
  nameJaKanji: string | null;
  nameJaKana: string | null;
  spotifyArtist: { name: string | null } | null;
  youtubeChannels: Array<{ title: string | null }>;
};

export interface AutoFillArtistNamesRange {
  minArtistId?: number;
  maxArtistId: number;
}

export interface AutoFillArtistNamesOptions {
  dryRun?: boolean;
  verbose?: boolean;
  logger?: (line: string) => void;
}

export type ArtistNameUpdate = {
  field: ArtistNameField;
  value: string;
  source: "spotify" | "artistName" | "topicChannel";
};

export type ArtistNameChange = {
  artistId: number;
  artistName: string;
  updates: ArtistNameUpdate[];
};

export interface AutoFillArtistNamesResult {
  maxArtistId: number;
  totalArtists: number;
  updatedArtists: number;
  dryRun: boolean;
  fieldUpdates: Record<ArtistNameField, number>;
  changes: ArtistNameChange[];
}

const removeSpecialChars = (text: string) =>
  text.replace(
    /[『』「」【】［］()（）[\]<>《》{}\s!@#$%^&*_+=|\\:;"',.<>?/~`-]/g,
    "",
  );

const isOnlyLatin = (text: string) => /^[a-zA-Z0-9]+$/.test(text);

const hasKanji = (text: string) => /[\u4e00-\u9faf]/.test(text);

const detectField = (name: string): ArtistNameField => {
  const cleaned = removeSpecialChars(name);

  if (isOnlyLatin(cleaned)) return "nameLatin";
  if (hasKanji(cleaned)) return "nameJaKanji";
  if (isKana(cleaned)) return "nameJaKana";
  return "nameKo";
};

export async function autoFillArtistNames(
  range: AutoFillArtistNamesRange,
  options: AutoFillArtistNamesOptions = {},
): Promise<AutoFillArtistNamesResult> {
  const { dryRun = false, verbose = false, logger } = options;
  const minArtistId = range.minArtistId ?? 1;
  const maxArtistId = range.maxArtistId;
  const emit = (line: string) => {
    if (logger) logger(line);
    if (verbose) console.log(line);
  };

  emit(
    `\n👤 autoFillArtistNames → artistId ${minArtistId}~${maxArtistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const artists = await prisma.artist.findMany({
    where: { id: { gte: minArtistId, lte: maxArtistId } },
    orderBy: { id: "asc" },
    select: {
      id: true,
      name: true,
      nameKo: true,
      nameLatin: true,
      nameJaKanji: true,
      nameJaKana: true,
      spotifyArtist: { select: { name: true } },
      youtubeChannels: {
        where: { type: "TOPIC" },
        select: { title: true },
      },
    },
  });

  emit(`  • Loaded ${artists.length} artists`);

  const changes: ArtistNameChange[] = [];
  const fieldUpdates: Record<ArtistNameField, number> = {
    nameLatin: 0,
    nameJaKanji: 0,
    nameJaKana: 0,
    nameKo: 0,
  };

  for (const artist of artists) {
    const updateData: Partial<Record<ArtistNameField, string>> = {};
    const updates: ArtistNameUpdate[] = [];

    const saveName = (
      name: string | null | undefined,
      source: ArtistNameUpdate["source"],
    ) => {
      if (!name) return;
      const field = detectField(name);

      const currentValue = (artist as Record<ArtistNameField, string | null>)[field];
      if (currentValue || updateData[field]) return;

      updateData[field] = name;
      updates.push({ field, value: name, source });
      fieldUpdates[field] += 1;
    };

    saveName(artist.spotifyArtist?.name, "spotify");
    saveName(artist.name, "artistName");

    const topicTitle = artist.youtubeChannels[0]?.title;
    if (topicTitle?.endsWith(" - Topic")) {
      saveName(topicTitle.replace(/ - Topic$/i, "").trim(), "topicChannel");
    }

    if (updates.length === 0) continue;

    changes.push({
      artistId: artist.id,
      artistName: artist.name,
      updates,
    });

    emit(
      `  [Artist #${artist.id}] ${updates
        .map((item) => `${item.field}="${item.value}" (${item.source})`)
        .join(", ")}`,
    );

    if (!dryRun) {
      await prisma.artist.update({
        where: { id: artist.id },
        data: updateData,
      });
    }
  }

  if (dryRun) {
    emit("  • DRY-RUN: no database writes");
  }

  return {
    maxArtistId,
    totalArtists: artists.length,
    updatedArtists: changes.length,
    dryRun,
    fieldUpdates,
    changes,
  };
}
