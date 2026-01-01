export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Admin API
export async function getAdminArtists() {
  const res = await fetch(`${API_BASE_URL}/admin/artists`);
  if (!res.ok) throw new Error("Failed to fetch artists");
  return res.json();
}

export async function getAdminArtistSongs(artistId: number) {
  const res = await fetch(`${API_BASE_URL}/admin/artists/${artistId}/songs`);
  if (!res.ok) throw new Error("Failed to fetch artist songs");
  return res.json();
}
