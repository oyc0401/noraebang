export enum Provider {
  TJ = 'TJ',
  KY = 'KY',
  JOYSOUND = 'JOYSOUND',
}

export interface Artist {
  id: number;
  name: string;
  nameKo: string;
  nameNorm: string;
  youtubeChannelUrl?: string;
  tjSongRequestUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Song {
  id: number;
  title: string;
  titleKo?: string;
  titleNorm: string;
  youtubeVideoId?: string;
  youtubeFetchedAt?: Date;
  primaryArtistId?: number;
  primaryArtist?: Artist;
  createdAt: Date;
  updatedAt: Date;
  karaokeSongs: KaraokeSong[];
}

export interface KaraokeSong {
  id: number;
  songId: number;
  provider: Provider;
  karaokeNo: string;
  providerSongUrl?: string;
  lastSeenAt?: Date;
  ingestedAt?: Date;
  ingestedFrom?: string;
}
