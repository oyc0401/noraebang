import type { Prisma } from "@prisma/client";

// song_creation_queue의 JSON 컬럼에 저장되는 선택 미디어 (UI 표시용 제목 포함)
export type QueueYoutubeVideo = {
  id: string;
  title: string;
  thumbnailMedium: string | null;
  viewCount: string | null;
};

export type QueueSpotifyTrack = {
  id: string;
  name: string;
  releaseDate: string | null;
  albumImage: string | null;
};

export function parseQueueYoutubeVideos(
  value: Prisma.JsonValue,
): QueueYoutubeVideo[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record = asRecord(item);
    const id = asString(record?.id);
    const title = asString(record?.title);

    if (!id) {
      return [];
    }

    return [
      {
        id,
        title: title ?? "",
        thumbnailMedium: asString(record?.thumbnailMedium),
        viewCount: asString(record?.viewCount),
      },
    ];
  });
}

export function parseQueueSpotifyTracks(
  value: Prisma.JsonValue,
): QueueSpotifyTrack[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const record = asRecord(item);
    const id = asString(record?.id);
    const name = asString(record?.name);

    if (!id) {
      return [];
    }

    return [
      {
        id,
        name: name ?? "",
        releaseDate: asString(record?.releaseDate),
        albumImage: asString(record?.albumImage),
      },
    ];
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
