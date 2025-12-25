export enum Provider {
  TJ = 'TJ',
  KY = 'KY',
  JOYSOUND = 'JOYSOUND',
}

export interface Artist {
  id: number;
  name: string;
  nameNorm: string;
  pathname: string;
  youtubeChannelUrl?: string | null;
  tjSongRequestUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KaraokeSong {
  id: number;
  songId: number;
  provider: Provider;
  karaokeNo: string;
  providerSongUrl?: string | null;
  lastSeenAt?: Date | null;
  ingestedAt?: Date | null;
  ingestedFrom?: string | null;
}

export interface Song {
  id: number;
  title: string;
  titleKo?: string | null;
  titleNorm: string;
  youtubeVideoId?: string | null;
  youtubeFetchedAt?: Date | null;
  primaryArtistId?: number | null;
  primaryArtist?: Artist;
  createdAt: Date;
  updatedAt: Date;
  karaokeSongs: KaraokeSong[];
}
