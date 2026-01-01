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
    queryFn: () => getAdminArtistSongs(artistId!),
    enabled: artistId !== null,
  });
}
