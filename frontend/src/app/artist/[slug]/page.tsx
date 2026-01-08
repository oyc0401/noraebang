import { artistsControllerFindBySlug } from "@/api/model/artists/artists";
import { songsControllerFindByArtistId } from "@/api/model/songs/songs";
import ArtistPageClient from "./ArtistPageClient";
import { ARTIST_SONGS_PAGE_SIZE } from "./constants";

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await artistsControllerFindBySlug(slug);

  if (!artist.data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background-dark text-white">
        아티스트를 찾을 수 없습니다
      </div>
    );
  }

  const songsResponse = await songsControllerFindByArtistId(artist.data.id, {
    page: "1",
    limit: `${ARTIST_SONGS_PAGE_SIZE}`,
  });

  return (
    <ArtistPageClient
      artist={artist.data}
      initialSongsResponse={songsResponse}
    />
  );
}
