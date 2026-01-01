import { useQuery } from "@tanstack/react-query";
import { getAdminArtistSongs, getAdminArtists } from "@/lib/api";

export function useAdminArtists() {
  return useQuery({
    queryKey: ["admin", "artists"],
    queryFn: getAdminArtists,
  });
}

export function useAdminArtistSongs(artistId: number | null) {
  return useQuery({
    queryKey: ["admin", "artists", artistId, "songs"],
    queryFn: async () => {
      if (artistId === null) {
        throw new Error("artistId is required");
      }
      return getAdminArtistSongs(artistId);
    },
    enabled: artistId !== null,
  });
}
