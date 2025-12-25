import { useQuery } from '@tanstack/react-query';
import { Artist } from '@/types/models';
import { API_BASE_URL } from '@/lib/api';

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
      const response = await fetch(`${API_BASE_URL}/artists`);
      if (!response.ok) throw new Error('Failed to fetch artists');
      const result: ArtistsResponse = await response.json();
      return result.data;
    },
  });
}

export function useArtist(alias: string) {
  return useQuery({
    queryKey: ['artist', alias],
    queryFn: async (): Promise<Artist> => {
      const response = await fetch(`${API_BASE_URL}/artists/${alias}`);
      if (!response.ok) throw new Error('Failed to fetch artist');
      const result: ArtistResponse = await response.json();
      return result.data;
    },
  });
}
