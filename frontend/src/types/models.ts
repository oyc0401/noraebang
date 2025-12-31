export enum Provider {
  TJ = 'TJ',
  KY = 'KY',
  JOYSOUND = 'JOYSOUND',
}

export interface YoutubeChannel {
  channelId: string;
  title: string;
  description: string | null;
  subscriberCount: number | null;
  videoCount: number | null;
  thumbnail: string | null;
  customUrl: string | null;
}

export interface Artist {
  id: number;
  name: string;
  nameKo: string;
  alias: string;
  youtubeChannelId?: string;
  tjSongRequestUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ArtistWithYoutube extends Artist {
  youtube: YoutubeChannel | null;
}

export interface Song {
  id: number;
  title: string;
  titleKo?: string;
  youtubeVideoId?: string;
  youtubeFetchedAt?: Date;
  artistId: number;
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
