import { prisma } from "../prisma";
import { searchTJPropose } from "../../thirdparty/tj/searchPropose";

export interface FetchProposeForArtistOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

export interface FetchProposeForArtistResult {
  artistId: number;
  artistName: string;
  tjName: string;
  stats: {
    fetched: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  /** dry run일 때 미리보기용 */
  preview: Array<{
    songTitle: string;
    songSinger: string;
    regdateView: string;
  }>;
}

/**
 * 특정 아티스트의 TJ 신청곡을 수집하여 DB에 저장합니다.
 *
 * @param artistId - 아티스트 ID
 * @param options.dryRun - true면 DB 변경 없이 조회만
 * @param options.verbose - true면 콘솔 출력
 * @returns 수집 결과
 */
export async function fetchProposeForArtist(
  artistId: number,
  options: FetchProposeForArtistOptions = {},
): Promise<FetchProposeForArtistResult> {
  const { dryRun = false, verbose = false } = options;
  const log = verbose ? console.log : () => {};

  // 1. 아티스트 정보 조회
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      tjName: true,
    },
  });

  if (!artist) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  if (!artist.tjName) {
    throw new Error(`Artist #${artistId} has no tjName`);
  }

  const tjName = artist.tjName;

  log(`\n[Artist #${artist.id}] ${artist.name} (tjName: ${tjName})`);
  if (dryRun) log(`  🔍 DRY-RUN MODE`);

  const stats = {
    fetched: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };
  const preview: FetchProposeForArtistResult["preview"] = [];

  try {
    // 2. TJ 신청곡 검색
    const proposeItems = await searchTJPropose(tjName);

    if (proposeItems.length === 0) {
      log(`  → 신청곡 없음`);
      return {
        artistId: artist.id,
        artistName: artist.name,
        tjName,
        stats,
        preview,
      };
    }

    stats.fetched = proposeItems.length;
    log(`  → ${proposeItems.length}개 신청곡 발견`);

    if (dryRun) {
      // dry run: 미리보기만
      for (const item of proposeItems.slice(0, 5)) {
        preview.push({
          songTitle: item.po_song_title,
          songSinger: item.po_song_singer,
          regdateView: item.po_regdate_view,
        });
        log(`     - ${item.po_song_title} / ${item.po_song_singer} (${item.po_regdate_view})`);
      }
      if (proposeItems.length > 5) {
        log(`     ... 외 ${proposeItems.length - 5}개`);
      }
    } else {
      // 3. DB 반영
      for (const item of proposeItems) {
        try {
          const where = {
            saveDate: BigInt(item.save_date),
            songSinger: item.po_song_singer,
            songTitle: item.po_song_title,
            email1: item.po_email1,
            email2: item.po_email2,
          } as const;

          const existing = await prisma.songPropose.findFirst({ where });

          if (existing) {
            // query가 비었거나 다르면 채움
            if (existing.query !== tjName) {
              await prisma.songPropose.update({
                where: { id: existing.id },
                data: { query: tjName },
              });
              stats.updated++;
            } else {
              stats.skipped++;
            }
            continue;
          }

          await prisma.songPropose.create({
            data: {
              query: tjName,
              songSinger: item.po_song_singer,
              songTitle: item.po_song_title,
              content: item.po_content,
              name: item.po_name,
              email1: item.po_email1,
              email2: item.po_email2,
              otCode: item.ot_code,
              hit: item.po_hit,
              regdateView: item.po_regdate_view,
              saveDate: BigInt(item.save_date),
              updateDate: BigInt(item.update_date),
            },
          });
          stats.created++;
        } catch {
          stats.errors++;
        }
      }

      log(`  → 반영 완료 (신규: ${stats.created}, 업데이트: ${stats.updated}, 스킵: ${stats.skipped})`);
      if (stats.errors > 0) {
        log(`  ⚠️ 오류: ${stats.errors}건`);
      }

      // tjProposeFetchedAt 업데이트
      await prisma.artist.update({
        where: { id: artistId },
        data: { tjProposeFetchedAt: new Date() },
      });
    }
  } catch (error) {
    stats.errors++;
    log(`  ❌ 오류: ${error}`);
    throw error;
  }

  return {
    artistId: artist.id,
    artistName: artist.name,
    tjName,
    stats,
    preview,
  };
}
