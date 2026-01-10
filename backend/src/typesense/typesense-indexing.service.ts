import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { indexDocuments, recreateCollection } from "./indexer";
import {
  artistsCollectionSchema,
  songsCollectionSchema,
} from "./schema";
import { TypesenseService } from "./typesense.service";
import {
  transformArtistToDocument,
  transformSongToDocument,
} from "./transformer";

interface ReindexOptions {
  maxArtistId?: number;
}

@Injectable()
export class TypesenseIndexingService {
  private readonly logger = new Logger(TypesenseIndexingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly typesenseService: TypesenseService,
  ) {}

  async reindexArtists(
    options?: ReindexOptions,
  ): Promise<{ indexedCount: number }> {
    const client = this.typesenseService.getClient();

    this.logger.log("Recreating artists collection...");
    await recreateCollection(client, artistsCollectionSchema);

    const maxArtistId = options?.maxArtistId ?? 300;

    this.logger.log("Fetching artists from database...");
    const artists = await this.prisma.artist.findMany({
      where: { id: { lte: maxArtistId } },
      include: {
        aliases: true,
        spotifyArtist: {
          select: {
            popularity: true,
          },
        },
      },
    });

    this.logger.log(`Transforming ${artists.length} artists...`);
    const documents = artists.map(transformArtistToDocument);

    await indexDocuments(
      client,
      artistsCollectionSchema.name,
      documents,
    );

    return { indexedCount: documents.length };
  }

  async reindexSongs(
    options?: ReindexOptions,
  ): Promise<{ indexedCount: number }> {
    const client = this.typesenseService.getClient();

    this.logger.log("Recreating songs collection...");
    await recreateCollection(client, songsCollectionSchema);

    const maxArtistId = options?.maxArtistId ?? 300;

    this.logger.log("Fetching songs from database...");
    const songs = await this.prisma.song.findMany({
      where: {
        artistSongs: {
          some: {
            artistId: {
              lte: maxArtistId,
            },
          },
        },
      },
      include: {
        aliases: true,
        artistSongs: {
          include: {
            artist: {
              include: {
                aliases: true,
                spotifyArtist: {
                  select: { popularity: true },
                },
              },
            },
          },
        },
        karaokeSongs: true,
        spotifyTrack: {
          include: {
            spotifyTrack: {
              select: {
                popularity: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Transforming ${songs.length} songs...`);
    const documents = songs.map(transformSongToDocument);

    await indexDocuments(client, songsCollectionSchema.name, documents);

    return { indexedCount: documents.length };
  }
}
