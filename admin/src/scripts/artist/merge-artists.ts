/**
 * 특정 아티스트의 곡/유튜브 채널을 다른 아티스트로 병합하는 스크립트
 *
 * pnpm ts-node src/scripts/artist/merge-artists.ts --from=323 --to=76
 * pnpm ts-node src/scripts/artist/merge-artists.ts --from=323 --to=76 --execute
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type ChannelType } from "@prisma/client";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ["warn", "error"] });

const fromArg = process.argv.find((arg) => arg.startsWith("--from="));
const toArg = process.argv.find((arg) => arg.startsWith("--to="));
const shouldExecute = process.argv.includes("--execute");

const fromArtistId = fromArg ? Number.parseInt(fromArg.split("=")[1], 10) : NaN;
const toArtistId = toArg ? Number.parseInt(toArg.split("=")[1], 10) : NaN;

if (!Number.isFinite(fromArtistId) || !Number.isFinite(toArtistId)) {
  console.error(
    "❌ --from 및 --to 인자를 모두 지정해주세요. 예: --from=323 --to=76",
  );
  process.exit(1);
}

if (fromArtistId === toArtistId) {
  console.error("❌ --from 과 --to 값이 동일합니다. 서로 다른 ID를 지정하세요.");
  process.exit(1);
}

type ArtistSummary = {
  id: number;
  name: string;
  nameKo: string | null;
  alias: string | null;
  songCount: number;
  channelCount: number;
};

async function fetchArtistSummary(id: number): Promise<ArtistSummary | null> {
  const artist = await prisma.artist.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nameKo: true,
      alias: true,
      _count: {
        select: {
          artistSongs: true,
          youtubeChannels: true,
        },
      },
    },
  });

  if (!artist) return null;

  return {
    id: artist.id,
    name: artist.name,
    nameKo: artist.nameKo,
    alias: artist.alias,
    songCount: artist._count.artistSongs,
    channelCount: artist._count.youtubeChannels,
  };
}

async function run() {
  console.log("🔁 아티스트 병합 준비 중...\n");

  const [fromArtist, toArtist] = await Promise.all([
    fetchArtistSummary(fromArtistId),
    fetchArtistSummary(toArtistId),
  ]);

  if (!fromArtist) {
    console.error(`❌ 대상(from) 아티스트(ID: ${fromArtistId})를 찾을 수 없습니다.`);
    process.exit(1);
  }

  if (!toArtist) {
    console.error(
      `❌ 병합 대상(to) 아티스트(ID: ${toArtistId})를 찾을 수 없습니다.`,
    );
    process.exit(1);
  }

  console.log(
    `📦 From [${fromArtist.id}] ${fromArtist.name} / ${fromArtist.nameKo ?? "-"} (곡 ${fromArtist.songCount}개, 채널 ${fromArtist.channelCount}개`,
  );
  console.log(
    `🎯 To   [${toArtist.id}] ${toArtist.name} / ${toArtist.nameKo ?? "-"} (곡 ${toArtist.songCount}개, 채널 ${toArtist.channelCount}개)\n`,
  );

  if (!shouldExecute) {
    console.log(
      "ℹ️  --execute 옵션이 없어 시뮬레이션만 수행됩니다. 실제 병합을 실행하려면 --execute 를 추가하세요.",
    );
    return;
  }

  console.log("⚠️  실제 병합을 실행합니다...");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sourceSongs = await tx.artistSong.findMany({
        where: { artistId: fromArtistId },
        select: {
          songId: true,
          order: true,
          role: true,
        },
      });

      let copiedSongs = 0;
      let skippedSongs = 0;
      if (sourceSongs.length > 0) {
        const createResult = await tx.artistSong.createMany({
          data: sourceSongs.map((song) => ({
            artistId: toArtistId,
            songId: song.songId,
            order: song.order,
            role: song.role,
          })),
          skipDuplicates: true,
        });
        copiedSongs = createResult.count;
        skippedSongs = sourceSongs.length - createResult.count;
      }

      await tx.artistSong.deleteMany({
        where: { artistId: fromArtistId },
      });

      const targetChannels = await tx.youtubeChannel.findMany({
        where: { artistId: toArtistId },
        select: { id: true, type: true },
      });
      const targetChannelTypes = new Map<ChannelType, number>();
      for (const channel of targetChannels) {
        targetChannelTypes.set(channel.type, channel.id);
      }

      const sourceChannels = await tx.youtubeChannel.findMany({
        where: { artistId: fromArtistId },
      });

      let movedChannels = 0;
      let skippedChannels = 0;

      for (const channel of sourceChannels) {
        if (targetChannelTypes.has(channel.type)) {
          skippedChannels += 1;
          continue;
        }

        await tx.youtubeChannel.update({
          where: { id: channel.id },
          data: { artistId: toArtistId },
        });

        targetChannelTypes.set(channel.type, channel.id);
        movedChannels += 1;
      }

      // 남은 채널은 (유형 충돌 등으로) 이동하지 못했으므로 삭제된다.
      await tx.youtubeChannel.deleteMany({
        where: { artistId: fromArtistId },
      });

      await tx.artist.delete({
        where: { id: fromArtistId },
      });

      return {
        copiedSongs,
        skippedSongs,
        movedChannels,
        skippedChannels,
      };
    });

    console.log(
      `✅ 곡 병합 완료 - 생성: ${result.copiedSongs}개, 중복으로 스킵: ${result.skippedSongs}개`,
    );

    if (result.movedChannels > 0 || result.skippedChannels > 0) {
      console.log(
        `✅ 유튜브 채널 이동 완료 - 이동: ${result.movedChannels}개, 충돌로 미이동: ${result.skippedChannels}개`,
      );
      if (result.skippedChannels > 0) {
        console.log(
          "   ⚠️  동일한 채널 유형이 이미 존재하여 남은 채널 정보는 삭제되었습니다.",
        );
      }
    }

    console.log(`🧹 아티스트 [${fromArtistId}] 삭제 완료.`);
  } catch (error) {
    console.error("❌ 병합 중 오류가 발생했습니다.", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("❌ 예상치 못한 오류가 발생했습니다.", error);
  process.exit(1);
});

