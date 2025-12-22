import { useQuery } from '@tanstack/react-query';
import { Artist } from '@/types/models';

interface ArtistsResponse {
  data: Artist[];
}

interface ArtistResponse {
  data: Artist;
}

export function useArtists() {
  return useQuery({
    queryKey: ['artists'],
    queryFn: async (): Promise<Artist[]> => {
      const response = await fetch('/api/artists');

      if (!response.ok) {
        throw new Error('Failed to fetch artists');
      }

      const result: ArtistsResponse = await response.json();
      return result.data;
    },
  });
}

export function useArtist(pathname: string | null) {
  return useQuery({
    queryKey: ['artist', pathname],
    queryFn: async (): Promise<Artist> => {
      if (!pathname) throw new Error('Artist pathname is required');

      const response = await fetch(`/api/artists/${pathname}`);

      if (!response.ok) {
        throw new Error('Failed to fetch artist');
      }

      const result: ArtistResponse = await response.json();
      return result.data;
    },
    enabled: !!pathname,
  });
}
