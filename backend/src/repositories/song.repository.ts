import type { Song } from "@prisma/client";

export interface SongRepository {
  findAll(): Promise<Song[]>;
  findById(id: number): Promise<Song | null>;
  searchByTitle(query: string): Promise<Song[]>;
  findByArtistId(artistId: number): Promise<Song[]>;
  findByArtistIds(artistIds: number[]): Promise<Song[]>;
}
