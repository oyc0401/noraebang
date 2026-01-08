import { artistsControllerFindBySlug } from "@/api/model/artists/artists";
import { songsControllerFindByArtistId } from "@/api/model/songs/songs";
import ArtistPageClient from "./ArtistPageClient";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artist = await artistsControllerFindBySlug(slug);

  if (!artist.data) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        아티스트를 찾을 수 없습니다
      </div>
    );
  }

  const songsResponse = await songsControllerFindByArtistId(artist.data.id, {
    limit: "20",
    offset: "0",
  });
  const songs = songsResponse.data ?? [];

  return <ArtistPageClient artist={artist.data} initialSongs={songs} />;
}
