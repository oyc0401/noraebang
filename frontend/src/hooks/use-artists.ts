import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/api";
import type { Artist, ArtistWithYoutube } from "@/types/models";

interface ArtistsResponse {
  data: Artist[];
}

interface ArtistsWithYoutubeResponse {
  data: ArtistWithYoutube[];
  cached: boolean;
}

interface ArtistResponse {
  data: Artist;
}

export function useArtists() {
  return useQuery({
    queryKey: ["artists"],
    queryFn: async (): Promise<Artist[]> => {
      const response = await fetch(`${API_BASE_URL}/artists`);
      if (!response.ok) throw new Error("Failed to fetch artists");
      const result: ArtistsResponse = await response.json();
      return result.data;
    },
  });
}

export function useArtistsWithYoutube() {
  return useQuery({
    queryKey: ["artists", "youtube"],
    queryFn: async (): Promise<ArtistWithYoutube[]> => {
      const response = await fetch(
        `${API_BASE_URL}/artists?includeYoutube=true`,
      );
      if (!response.ok) throw new Error("Failed to fetch artists");
      const result: ArtistsWithYoutubeResponse = await response.json();
      return result.data;
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시 (서버와 동일)
  });
}

export function useArtist(alias: string) {
  return useQuery({
    queryKey: ["artist", alias],
    queryFn: async (): Promise<Artist> => {
      const response = await fetch(`${API_BASE_URL}/artists/${alias}`);
      if (!response.ok) throw new Error("Failed to fetch artist");
      const result: ArtistResponse = await response.json();
      return result.data;
    },
  });
}
