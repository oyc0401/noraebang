import { useQuery } from '@tanstack/react-query';
import { Song } from '@/types/models';

interface SongsResponse {
  data: Song[];
}

interface SongResponse {
  data: Song;
}

export function useSongs(query?: string, artistId?: number) {
  return useQuery({
    queryKey: ['songs', { query, artistId }],
    queryFn: async (): Promise<Song[]> => {
      const params = new URLSearchParams();
      if (query) params.append('q', query);
      if (artistId) params.append('artistId', artistId.toString());

      const url = `/api/songs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch songs');
      }

      const result: SongsResponse = await response.json();
      return result.data;
    },
  });
}

export function useSong(id: number) {
  return useQuery({
    queryKey: ['song', id],
    queryFn: async (): Promise<Song> => {
      const response = await fetch(`/api/songs/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch song');
      }

      const result: SongResponse = await response.json();
      return result.data;
    },
  });
}
