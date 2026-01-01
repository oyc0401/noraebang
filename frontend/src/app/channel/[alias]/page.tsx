import { notFound } from "next/navigation";
import { artistsControllerFindByIdOrAlias } from "@/api/model/artists/artists";
import { songsControllerFindAll } from "@/api/model/songs/songs";
import { getResponseData } from "@/api/utils";
import type { Artist, Song } from "@/types/models";
import ArtistPageClient from "./ArtistPageClient";

async function getArtist(alias: string): Promise<Artist> {
  try {
    const response = await artistsControllerFindByIdOrAlias(alias);
    return getResponseData<Artist>(response);
  } catch {
    return notFound();
  }
}

async function getSongs(artistId: number): Promise<Song[]> {
  try {
    const response = await songsControllerFindAll({
      artistId: artistId.toString(),
    });
    return getResponseData<Song[]>(response);
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
