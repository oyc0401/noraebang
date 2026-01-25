import { artistsControllerFindBySlug } from "@/api/model/artists/artists";
import ArtistPageClient from "./ArtistPageClient";

export const revalidate = 1800;

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

  return <ArtistPageClient artist={artist.data} />;
}
