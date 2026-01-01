import { notFound } from "next/navigation";
import { artistsControllerFindByIdOrAlias } from "@/api/model/artists/artists";
import { songsControllerFindAll } from "@/api/model/songs/songs";
import type { ArtistDto, SongDto } from "@/api/model/models";
import ArtistPageClient from "./ArtistPageClient";

async function getArtist(alias: string): Promise<ArtistDto> {
  try {
    const response = await artistsControllerFindByIdOrAlias(alias);
    return response.data;
  } catch {
    return notFound();
  }
}

async function getSongs(artistId: number): Promise<SongDto[]> {
  try {
    const response = await songsControllerFindAll({
      artistId: artistId.toString(),
    });
    return response.data;
  } catch {
    return [];
  }
}

export default async function ArtistPage({
  params,
}: {
  params: Promise<{ alias: string }>;
}) {
  const { alias } = await params;
  const artist = await getArtist(alias);
  const songs = await getSongs(artist.id);

  return <ArtistPageClient artist={artist} initialSongs={songs} />;
}
