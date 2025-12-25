import type { Artist, YoutubeChannel } from '@prisma/client';

export type ArtistWithYoutube = Artist & {
  youtubeChannel: YoutubeChannel | null;
};

export interface ArtistRepository {
  findAll(): Promise<Artist[]>;
  findAllWithYoutube(): Promise<ArtistWithYoutube[]>;
  findById(id: number): Promise<Artist | null>;
  findByAlias(alias: string): Promise<Artist | null>;
  findByAliases(aliases: string[]): Promise<Artist[]>;
}
