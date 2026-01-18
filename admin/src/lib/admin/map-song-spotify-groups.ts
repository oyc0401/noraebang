import { prisma } from "../prisma";
import { findBestMatch } from "../song-spotify-matcher";

// mapSongSpotifyGroups는 특정 아티스트의 스포티파이 트랙(그룹 미지정)을 Song과 매칭하여 그룹에 연결합니다.
// - 그룹에 들어있지 않은 트랙들(groupId === null)을 대상으로 매칭 수행
// - 트랙의 musicBrainzTitle(1순위) 또는 name(2순위)과 Song의 title/titleKo/titleLatin/titleJa 비교
// - 매칭된 Song에 그룹이 없으면 그룹을 생성하고 Song과 연결
// - primary는 deprecated이므로 저장하지 않음

type ArtistData = {
  artistId: number;
  artistName: string;
  artistNameKo: string;
  spotifyArtistId: number | null;
  songs: Array<{
    id: number;
    title: string;
    titleKo: string | null;
    titleLatin: string | null;
    titleJa: string | null;
    spotifyTrackGroupId: number | null;
  }>;
  ungroupedTracks: Array<{
    id: number;
    name: string;
    musicBrainzTitle: string | null;
  }>;
};

type Mapping = {
  trackId: number;
  trackName: string;
  songId: number;
  songTitle: string;
  existingGroupId: number | null;
};

export interface MapSongSpotifyGroupsOptions {
  dryRun?: boolean;
}

async function fetchArtistData(artistId: number): Promise<ArtistData | null> {
  const artist = await prisma.artist.findUnique({
    where: { id: artistId },
    select: {
      id: true,
      name: true,
      nameKo: true,
      spotifyId: true,
    },
  });

  if (!artist) return null;

  const spotifyArtist = artist.spotifyId
    ? await prisma.spotifyArtist.findUnique({
        where: { spotifyId: artist.spotifyId },
        select: { id: true },
      })
    : null;

  const songs = await prisma.song.findMany({
    where: { artistSongs: { some: { artistId } } },
    select: {
      id: true,
      title: true,
      titleKo: true,
      titleLatin: true,
      titleJa: true,
      spotifyTrackGroupId: true,
    },
  });

  // 그룹에 들어있지 않은 트랙들만 조회
  const ungroupedTracks = spotifyArtist
    ? await prisma.spotifyTrack.findMany({
        where: {
          disabled: false,
          groupId: null,
          artists: {
            some: { spotifyArtistId: spotifyArtist.id },
          },
        },
        select: {
          id: true,
          name: true,
          musicBrainzTitle: true,
        },
      })
    : [];

  return {
    artistId: artist.id,
    artistName: artist.name,
    artistNameKo: artist.nameKo,
    spotifyArtistId: spotifyArtist?.id ?? null,
    songs,
    ungroupedTracks,
  };
}

function generateMappings(data: ArtistData): Mapping[] {
  const mappings: Mapping[] = [];

  // title → Song 맵 생성 (중복 제거 + O(1) 조회)
  const titleToSong = new Map<string, ArtistData["songs"][number]>();
  for (const song of data.songs) {
    if (song.title?.trim()) titleToSong.set(song.title, song);
    if (song.titleKo?.trim()) titleToSong.set(song.titleKo, song);
    if (song.titleLatin?.trim()) titleToSong.set(song.titleLatin, song);
    if (song.titleJa?.trim()) titleToSong.set(song.titleJa, song);
  }
  const songTitleCandidates = [...titleToSong.keys()];

  // 각 트랙에 대해 매칭할 Song 찾기
  for (const track of data.ungroupedTracks) {
    let matchedSong: ArtistData["songs"][number] | undefined;

    // 1순위: musicBrainzTitle로 매칭
    if (track.musicBrainzTitle?.trim()) {
      const result = findBestMatch(track.musicBrainzTitle, songTitleCandidates);
      if (result.answer) {
        matchedSong = titleToSong.get(result.answer);
      }
    }

    // 2순위: name으로 매칭 (musicBrainzTitle 매칭 실패 시)
    if (!matchedSong) {
      const result = findBestMatch(track.name, songTitleCandidates);
      if (result.answer) {
        matchedSong = titleToSong.get(result.answer);
      }
    }

    if (matchedSong) {
      mappings.push({
        trackId: track.id,
        trackName: track.musicBrainzTitle || track.name,
        songId: matchedSong.id,
        songTitle:
          matchedSong.titleJa ||
          matchedSong.titleLatin ||
          matchedSong.titleKo ||
          matchedSong.title,
        existingGroupId: matchedSong.spotifyTrackGroupId,
      });
    }
  }

  return mappings;
}

async function applyMappings(
  mappings: Mapping[],
  options: { dryRun: boolean },
) {
  let applied = 0;
  let groupsCreated = 0;
  let errors = 0;

  for (const mapping of mappings) {
    try {
      let groupId = mapping.existingGroupId;

      // Song에 그룹이 없으면 그룹 생성 및 Song 연결
      if (!groupId) {
        if (options.dryRun) {
          console.log(
            `[DRY-RUN] 그룹 생성 + Song ${mapping.songId} 연결 예정`,
          );
          groupId = -1; // dry run용 임시 ID
          groupsCreated += 1;
        } else {
          const newGroup = await prisma.spotifyTrackGroup.create({
            data: {},
          });
          groupId = newGroup.id;

          await prisma.song.update({
            where: { id: mapping.songId },
            data: { spotifyTrackGroupId: groupId },
          });

          console.log(
            `✅ 그룹 ${groupId} 생성 → Song ${mapping.songId} 연결`,
          );
          groupsCreated += 1;
        }
      }

      // 트랙을 그룹에 연결
      if (options.dryRun) {
        console.log(
          `[DRY-RUN] Track ${mapping.trackId} (${mapping.trackName}) → Group ${groupId} (Song: ${mapping.songTitle})`,
        );
        applied += 1;
      } else {
        await prisma.spotifyTrack.update({
          where: { id: mapping.trackId },
          data: { groupId },
        });

        console.log(
          `✅ Track ${mapping.trackId} (${mapping.trackName}) → Group ${groupId}`,
        );
        applied += 1;
      }
    } catch (error) {
      console.error(
        `❌ Track ${mapping.trackId} 매핑 실패: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      errors += 1;
    }
  }

  return { applied, groupsCreated, errors };
}

export async function mapSongSpotifyGroups(
  artistId: number,
  options: MapSongSpotifyGroupsOptions = {},
): Promise<void> {
  const { dryRun = false } = options;

  console.log(
    `\n🎵 mapSongSpotifyGroups → artistId=${artistId} ${dryRun ? "(dry-run)" : ""}`,
  );

  const data = await fetchArtistData(artistId);
  if (!data) {
    throw new Error(`Artist not found: ${artistId}`);
  }

  if (data.songs.length === 0 || data.ungroupedTracks.length === 0) {
    console.log(
      `  ⏭️ No data (songs: ${data.songs.length}, ungroupedTracks: ${data.ungroupedTracks.length})`,
    );
    return;
  }

  console.log(`  • Artist: ${data.artistName} (${data.artistNameKo})`);
  console.log(
    `  • Songs: ${data.songs.length}, Ungrouped Tracks: ${data.ungroupedTracks.length}`,
  );

  const mappings = generateMappings(data);
  if (mappings.length === 0) {
    console.log(`  ⏭️ No mappings generated`);
    return;
  }

  console.log(`  • Mappings: ${mappings.length}`);

  const { applied, groupsCreated, errors } = await applyMappings(mappings, {
    dryRun,
  });

  console.log(
    `  • 결과: applied=${applied}, groupsCreated=${groupsCreated}, errors=${errors}`,
  );
}
