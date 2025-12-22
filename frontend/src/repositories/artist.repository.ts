import { Artist } from '@/types/models';

export interface ArtistRepository {
  findAll(): Promise<Artist[]>;
  findById(id: number): Promise<Artist | null>;
  findByPathname(pathname: string): Promise<Artist | null>;
}
