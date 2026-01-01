import { notFound } from 'next/navigation';
import { API_BASE_URL } from '@/lib/api';
import { Artist, Song } from '@/types/models';
import ArtistPageClient from './ArtistPageClient';

interface ArtistResponse {
  data: Artist;
}

interface SongsResponse {
  data: Song[];
}

async function getArtist(alias: string): Promise<Artist> {
  const res = await fetch(`${API_BASE_URL}/artists/${alias}`, {
    cache: 'no-store', // SSR - 항상 최신 데이터
  });

  if (!res.ok) {
    notFound();
  }

  const result: ArtistResponse = await res.json();
  return result.data;
}

async function getSongs(artistId: number): Promise<Song[]> {
  const res = await fetch(`${API_BASE_URL}/songs?artistId=${artistId}`, {
    cache: 'no-store', // SSR - 항상 최신 데이터
  });

  if (!res.ok) {
    return [];
  }

  const result: SongsResponse = await res.json();
  return result.data;
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
