import type { Artist } from '@prisma/client';

export interface ArtistRepository {
  findAll(): Promise<Artist[]>;
  findById(id: number): Promise<Artist | null>;
  findByAlias(alias: string): Promise<Artist | null>;
}
