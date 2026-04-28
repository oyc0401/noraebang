import { Injectable } from "@nestjs/common";
import { ArtistDetailsDto, ArtistDto } from "../dto";
import { PrismaService } from "../prisma/prisma.service";
import { SongsService } from "../songs/songs.service";

@Injectable()
export class ArtistsService {
  constructor(
    private prisma: PrismaService,
    private songsService: SongsService,
  ) {}

  async findById(id: number): Promise<ArtistDto | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjName: true,
        youtubeChannels: {
          select: {
            type: true,
            channelId: true,
            title: true,
            description: true,
            customUrl: true,
            subscriberCount: true,
            videoCount: true,
            thumbnailDefault: true,
            thumbnailMedium: true,
            thumbnailHigh: true,
          },
        },
        spotifyArtist: {
          select: {
            spotifyId: true,
            spotifyUrl: true,
            name: true,
            popularity: true,
            followers: true,
            genres: true,
            thumbnails: true,
          },
        },
        _count: {
          select: { artistSongs: true },
        },
      },
    });

    if (!artist) return null;

    const mainChannel =
      artist.youtubeChannels.find((ch) => ch.type === "MAIN") ??
      artist.youtubeChannels.find((ch) => ch.type === "TOPIC");

    const spotifyArtist = artist.spotifyArtist;

    return {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      slug: artist.slug ?? undefined,
      homeCatalog: artist.homeCatalog ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      tjName: artist.tjName ?? undefined,
      songCount: artist._count.artistSongs,
      youtube: mainChannel
        ? {
            channelId: mainChannel.channelId,
            title: mainChannel.title ?? undefined,
            description: mainChannel.description ?? undefined,
            customUrl: mainChannel.customUrl ?? undefined,
            subscriberCount: mainChannel.subscriberCount ?? undefined,
            videoCount: mainChannel.videoCount ?? undefined,
            thumbnailDefault: mainChannel.thumbnailDefault ?? undefined,
            thumbnailMedium: mainChannel.thumbnailMedium ?? undefined,
            thumbnailHigh: mainChannel.thumbnailHigh ?? undefined,
          }
        : undefined,
      spotify: spotifyArtist
        ? {
            spotifyId: spotifyArtist.spotifyId,
            spotifyUrl: spotifyArtist.spotifyUrl ?? undefined,
            name: spotifyArtist.name,
            popularity: spotifyArtist.popularity ?? undefined,
            followers: spotifyArtist.followers ?? undefined,
            genres:
              spotifyArtist.genres.length > 0
                ? spotifyArtist.genres
                : undefined,
            imageUrl: spotifyArtist.thumbnails[0] ?? undefined,
          }
        : undefined,
    };
  }

  /**
   * slug로 아티스트 상세 조회 (YouTube, Spotify 정보 + 곡 목록 포함)
   */
  async findBySlug(slug: string): Promise<ArtistDetailsDto | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        nameKo: true,
        slug: true,
        homeCatalog: true,
        thumbnailDefault: true,
        thumbnailMedium: true,
        thumbnailHigh: true,
        tjName: true,
        youtubeChannels: {
          select: {
            type: true,
            channelId: true,
            title: true,
            description: true,
            customUrl: true,
            subscriberCount: true,
            videoCount: true,
            thumbnailDefault: true,
            thumbnailMedium: true,
            thumbnailHigh: true,
          },
        },
        spotifyArtist: {
          select: {
            spotifyId: true,
            spotifyUrl: true,
            name: true,
            popularity: true,
            followers: true,
            genres: true,
            thumbnails: true,
          },
        },
        _count: {
          select: { artistSongs: true },
        },
      },
    });

    if (!artist) return null;

    const mainChannel =
      artist.youtubeChannels.find((ch) => ch.type === "MAIN") ??
      artist.youtubeChannels.find((ch) => ch.type === "TOPIC");

    const spotifyArtist = artist.spotifyArtist;

    // 아티스트의 모든 곡 가져오기 (페이지네이션 없이)
    const { songs } = await this.songsService.findByArtistId(
      artist.id,
      1,
      10000,
    );

    return {
      id: artist.id,
      name: artist.name,
      nameKo: artist.nameKo,
      slug: artist.slug ?? undefined,
      homeCatalog: artist.homeCatalog ?? undefined,
      thumbnailDefault: artist.thumbnailDefault ?? undefined,
      thumbnailMedium: artist.thumbnailMedium ?? undefined,
      thumbnailHigh: artist.thumbnailHigh ?? undefined,
      songCount: artist._count.artistSongs,
      tjName: artist.tjName ?? undefined,
      youtube: mainChannel
        ? {
            channelId: mainChannel.channelId,
            title: mainChannel.title ?? undefined,
            description: mainChannel.description ?? undefined,
            customUrl: mainChannel.customUrl ?? undefined,
            subscriberCount: mainChannel.subscriberCount ?? undefined,
            videoCount: mainChannel.videoCount ?? undefined,
            thumbnailDefault: mainChannel.thumbnailDefault ?? undefined,
            thumbnailMedium: mainChannel.thumbnailMedium ?? undefined,
            thumbnailHigh: mainChannel.thumbnailHigh ?? undefined,
          }
        : undefined,
      spotify: spotifyArtist
        ? {
            spotifyId: spotifyArtist.spotifyId,
            spotifyUrl: spotifyArtist.spotifyUrl ?? undefined,
            name: spotifyArtist.name,
            popularity: spotifyArtist.popularity ?? undefined,
            followers: spotifyArtist.followers ?? undefined,
            genres:
              spotifyArtist.genres.length > 0
                ? spotifyArtist.genres
                : undefined,
            imageUrl: spotifyArtist.thumbnails[0] ?? undefined,
          }
        : undefined,
      songs,
    };
  }
}
