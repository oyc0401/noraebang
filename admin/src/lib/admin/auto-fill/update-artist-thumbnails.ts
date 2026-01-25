import { prisma } from "../../prisma";

// updateArtistThumbnails는 아티스트의 썸네일을 자동으로 채웁니다.
// 우선순위: 1. Spotify 아티스트, 2. YouTube Topic 채널, 3. YouTube Main 채널

export interface UpdateArtistThumbnailsOptions {
  dryRun?: boolean;
}

type ThumbnailSource = {
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  source: "spotify" | "youtube-topic" | "youtube-main";
};

export async function updateArtistThumbnails(
  artistId: number,
  options: UpdateArtistThumbnailsOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🖼️ updateArtistThumbnails → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      thumbnailDefault: true,
      thumbnailMedium: true,
      thumbnailHigh: true,
      spotifyArtist: {
        select: {
          thumbnails: true,
        },
      },
      youtubeChannels: {
        select: {
          type: true,
          thumbnailDefault: true,
          thumbnailMedium: true,
          thumbnailHigh: true,
        },
        orderBy: {
          type: "asc", // MAIN < TOPIC (alphabetically, but we'll sort manually)
        },
      },
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  console.log(`  • Artist: ${artist.name} (${artist.nameKo ?? ""})`);

  // 이미 썸네일이 있으면 스킵
  if (artist.thumbnailDefault && artist.thumbnailMedium && artist.thumbnailHigh) {
    console.log(`  ⏭️ Already has all thumbnails`);
    return;
  }

  // 우선순위별로 썸네일 소스 수집
  const sources: ThumbnailSource[] = [];

  // 1. Spotify 아티스트 썸네일
  if (artist.spotifyArtist?.thumbnails && artist.spotifyArtist.thumbnails.length > 0) {
    const thumbnails = artist.spotifyArtist.thumbnails;
    // Spotify thumbnails는 보통 크기순 정렬 (작은것 -> 큰것)
    // 일반적으로 3개: 64x64, 300x300, 640x640
    sources.push({
      thumbnailDefault: thumbnails[0],
      thumbnailMedium: thumbnails[1] ?? thumbnails[0],
      thumbnailHigh: thumbnails[2] ?? thumbnails[1] ?? thumbnails[0],
      source: "spotify",
    });
  }

  // 2. YouTube Topic 채널
  const topicChannel = artist.youtubeChannels.find((ch) => ch.type === "TOPIC");
  if (topicChannel?.thumbnailDefault) {
    sources.push({
      thumbnailDefault: topicChannel.thumbnailDefault ?? undefined,
      thumbnailMedium: topicChannel.thumbnailMedium ?? undefined,
      thumbnailHigh: topicChannel.thumbnailHigh ?? undefined,
      source: "youtube-topic",
    });
  }

  // 3. YouTube Main 채널
  const mainChannel = artist.youtubeChannels.find((ch) => ch.type === "MAIN");
  if (mainChannel?.thumbnailDefault) {
    sources.push({
      thumbnailDefault: mainChannel.thumbnailDefault ?? undefined,
      thumbnailMedium: mainChannel.thumbnailMedium ?? undefined,
      thumbnailHigh: mainChannel.thumbnailHigh ?? undefined,
      source: "youtube-main",
    });
  }

  if (sources.length === 0) {
    console.log(`  ⏭️ No thumbnail sources available`);
    return;
  }

  // 우선순위가 가장 높은 소스 사용
  const bestSource = sources[0];
  console.log(`  • Source: ${bestSource.source}`);

  const updateData: Record<string, string> = {};

  if (!artist.thumbnailDefault && bestSource.thumbnailDefault) {
    updateData.thumbnailDefault = bestSource.thumbnailDefault;
    console.log(`    thumbnailDefault="${bestSource.thumbnailDefault}"`);
  }
  if (!artist.thumbnailMedium && bestSource.thumbnailMedium) {
    updateData.thumbnailMedium = bestSource.thumbnailMedium;
    console.log(`    thumbnailMedium="${bestSource.thumbnailMedium}"`);
  }
  if (!artist.thumbnailHigh && bestSource.thumbnailHigh) {
    updateData.thumbnailHigh = bestSource.thumbnailHigh;
    console.log(`    thumbnailHigh="${bestSource.thumbnailHigh}"`);
  }

  if (Object.keys(updateData).length === 0) {
    console.log(`  ⏭️ No updates needed`);
    return;
  }

  if (!dryRun) {
    await prisma.artist.update({
      where: { id: artist.id },
      data: updateData,
    });
  }

  console.log(`  • 결과: updated=${Object.keys(updateData).length} fields`);
}
