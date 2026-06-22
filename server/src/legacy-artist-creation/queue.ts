import { lookupArtistWithClaudeCode } from "./claude-code";
import type {
  ArtistCreationClaudeResult,
  ClaudeCodeArtistLookupOptions,
} from "./claude-code";

export type ArtistCreationTjSong = {
  id: string;
  title: string;
  artist: string | null;
  youtubeLink?: string | null;
  thumbnailImg?: string | null;
};

export type CreateArtistCreationQueueOptions = ClaudeCodeArtistLookupOptions & {
  homeCatalog?: string;
};

export type CreateArtistCreationQueueResult =
  | {
      status: "created" | "updated";
      queueId: number;
      claudeResult: ArtistCreationClaudeResult;
    }
  | {
      status: "skipped";
      reason: string;
    };

type ArtistCreationQueueRow = {
  id: number;
};

type SlugRow = {
  id: number;
};

type ArtistCreationPrisma = {
  artist: {
    findFirst(args: unknown): Promise<SlugRow | null>;
  };
  artistCreationQueue: {
    findFirst(args: unknown): Promise<ArtistCreationQueueRow | null>;
    create(args: {
      data: ArtistCreationQueueData;
    }): Promise<ArtistCreationQueueRow>;
    update(args: {
      where: { id: number };
      data: ArtistCreationQueueData;
    }): Promise<ArtistCreationQueueRow>;
  };
};

type ArtistCreationQueueData = {
  tjSongId: string;
  homeCatalog: string | null;
  name: string;
  nameKo: string;
  nameJa: string | null;
  nameJaKana: string | null;
  nameJaPronu: string | null;
  nameLatin: string | null;
  nameLatinPronu: string | null;
  tjName: string | null;
  tjNameJa: string | null;
  slug: string | null;
  youtube_channel: string | null;
  youtube_topic_channel: string | null;
  spotifyId: string | null;
  thumbnailDefault: string | null;
  thumbnailHigh: string | null;
  thumbnailMedium: string | null;
};

export async function createArtistCreationQueueFromTjSong(
  prisma: ArtistCreationPrisma,
  tjSong: ArtistCreationTjSong,
  options: CreateArtistCreationQueueOptions = {},
): Promise<CreateArtistCreationQueueResult> {
  const rawArtist = normalizeName(tjSong.artist);

  if (!rawArtist) {
    return { status: "skipped", reason: "tjSong.artist is empty" };
  }

  const claudeResult = await lookupArtistWithClaudeCode(
    {
      title: normalizeName(tjSong.title),
      rawArtist,
      youtubeLink: tjSong.youtubeLink,
      thumbnailImg: tjSong.thumbnailImg,
    },
    options,
  );

  const name = normalizeName(claudeResult.name) || rawArtist;
  const codeFields = await deriveCodeOwnedFields(name, rawArtist);

  const slug = await makeUniqueSlug(
    prisma,
    createSlugBase(claudeResult.slug || name),
    tjSong.id,
  );

  const data: ArtistCreationQueueData = {
    tjSongId: tjSong.id,
    homeCatalog: options.homeCatalog ?? "JPOP",

    name,
    nameKo: normalizeName(claudeResult.nameKo) || codeFields.fallbackNameKo,

    nameJa: codeFields.nameJa,
    nameJaKana: codeFields.nameJaKana,
    nameJaPronu: codeFields.nameJaPronu,
    nameLatin: codeFields.nameLatin,
    nameLatinPronu: codeFields.nameLatinPronu,

    tjName: rawArtist,
    tjNameJa: codeFields.tjNameJa,

    slug,

    youtube_channel: claudeResult.youtube_channel,
    youtube_topic_channel: claudeResult.youtube_topic_channel,
    spotifyId: claudeResult.spotifyId,

    thumbnailDefault:
      claudeResult.thumbnailDefault ?? tjSong.thumbnailImg ?? null,
    thumbnailHigh: claudeResult.thumbnailHigh,
    thumbnailMedium: claudeResult.thumbnailMedium,
  };

  const existing = await prisma.artistCreationQueue.findFirst({
    where: { tjSongId: tjSong.id },
    select: { id: true },
  });

  if (existing) {
    const updated = await prisma.artistCreationQueue.update({
      where: { id: existing.id },
      data,
    });

    return {
      status: "updated",
      queueId: updated.id,
      claudeResult,
    };
  }

  const created = await prisma.artistCreationQueue.create({ data });

  return {
    status: "created",
    queueId: created.id,
    claudeResult,
  };
}

async function deriveCodeOwnedFields(name: string, rawArtist: string) {
  const nameLatin = isLatinName(name) ? name : null;
  const nameJa = isJapaneseName(name) ? name : null;
  const nameJaKana = isKanaOnlyName(name) ? name : null;

  const nameJaPronu = nameJaKana ? await kanaToHangul(nameJaKana) : null;
  const nameLatinPronu = nameLatin ? latinToHangul(nameLatin) : null;

  return {
    nameJa,
    nameJaKana,
    nameJaPronu,
    nameLatin,
    nameLatinPronu,
    tjNameJa: isJapaneseName(rawArtist) ? rawArtist : null,
    fallbackNameKo: nameJaPronu ?? nameLatinPronu ?? name,
  };
}

async function makeUniqueSlug(
  prisma: ArtistCreationPrisma,
  baseSlug: string,
  currentTjSongId: string,
): Promise<string> {
  const base = baseSlug || "artist";

  if (!(await slugExists(prisma, base, currentTjSongId))) {
    return base;
  }

  for (let index = 2; index < 1000; index++) {
    const next = `${base}-${index}`;

    if (!(await slugExists(prisma, next, currentTjSongId))) {
      return next;
    }
  }

  throw new Error(`Unable to create unique slug for ${base}`);
}

async function slugExists(
  prisma: ArtistCreationPrisma,
  slug: string,
  currentTjSongId: string,
): Promise<boolean> {
  const artist = await prisma.artist.findFirst({
    where: { slug },
    select: { id: true },
  });

  if (artist) {
    return true;
  }

  const queue = await prisma.artistCreationQueue.findFirst({
    where: {
      slug,
      NOT: { tjSongId: currentTjSongId },
    },
    select: { id: true },
  });

  return Boolean(queue);
}

function normalizeName(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐-‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function createSlugBase(value: string): string {
  const slug = normalizeName(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug || "artist";
}

function isLatinName(value: string): boolean {
  return /^[a-zA-Z0-9\s&._'-]+$/.test(value);
}

function isJapaneseName(value: string): boolean {
  return /[\u3040-\u30ff\u4e00-\u9faf]/.test(value);
}

function isKanaOnlyName(value: string): boolean {
  const stripped = value.replace(/[\s・ー.-]/g, "");
  return stripped.length > 0 && /^[\u3040-\u30ff]+$/.test(stripped);
}

async function kanaToHangul(kana: string): Promise<string | null> {
  try {
    const importer = new Function(
      "return import('kanabarum')",
    ) as () => Promise<{
      Kanabarum?: new () => {
        init: () => void;
        kanaToHangul: (value: string) => string;
      };
    }>;

    const module = await importer();

    if (!module.Kanabarum) {
      return null;
    }

    const kanabarum = new module.Kanabarum();
    kanabarum.init();

    return normalizeName(kanabarum.kanaToHangul(kana)) || null;
  } catch {
    return null;
  }
}

function latinToHangul(value: string): string {
  const known: Record<string, string> = {
    "164": "일육사",
    aimer: "에메",
    eve: "이브",
    gumi: "구미",
    lisa: "리사",
    milet: "미레이",
    yoasobi: "요아소비",
    zutomayo: "즛토마요",
  };

  const key = value.toLowerCase();

  if (known[key]) {
    return known[key];
  }

  return value.replace(/[a-zA-Z0-9]+/g, (word) => {
    return known[word.toLowerCase()] ?? word;
  });
}
