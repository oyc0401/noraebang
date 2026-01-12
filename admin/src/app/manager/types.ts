export type ManagerSortKey = "idAsc" | "idDesc" | "popularityDesc";

export type ManagerArtistSummary = {
  id: number;
  name: string;
  nameKo: string;
  nameJa?: string | null;
  nameJaKana?: string | null;
  nameJaKanji?: string | null;
  nameLatin?: string | null;
  catalog?: string | null;
  slug?: string | null;
  songCount: number;
  popularity?: number | null;
  thumbnailDefault?: string | null;
  thumbnailMedium?: string | null;
  thumbnailHigh?: string | null;
};

export const MANAGER_PAGE_SIZE = 1000;

export const managerSortOptions: Array<{ key: ManagerSortKey; label: string }> =
  [
    { key: "idAsc", label: "ID 오름차순" },
    { key: "idDesc", label: "ID 내림차순" },
    { key: "popularityDesc", label: "스포티파이 인기순" },
  ];

export type ManagerArtistSongDetail = {
  id: number;
  title: string;
  titleKo?: string | null;
  catalog?: string | null;
  hasYoutube: boolean;
  youtubeVideoId?: string | null;
  thumbnails: {
    default?: string | null;
    medium?: string | null;
    high?: string | null;
  };
  karaoke: Array<{
    provider: string;
    karaokeNo: string;
  }>;
  spotifyGroup?: {
    id: number;
    primaryTrack: ManagerSpotifyTrackSummary | null;
  } | null;
};

export type ManagerArtistYoutubeChannel = {
  id: number;
  type: string;
  channelId: string;
  title?: string | null;
  subscriberCount?: number | null;
  thumbnails: {
    default?: string | null;
    medium?: string | null;
    high?: string | null;
  };
};

export type ManagerArtistDetail = {
  id: number;
  name: string;
  nameKo: string;
  nameJa?: string | null;
  nameJaKana?: string | null;
  nameJaKanji?: string | null;
  nameLatin?: string | null;
  catalog?: string | null;
  slug?: string | null;
  songCount: number;
  spotifyId?: string | null;
  thumbnails: {
    default?: string | null;
    medium?: string | null;
    high?: string | null;
  };
  spotify?: {
    name?: string | null;
    thumbnails?: string[];
    popularity?: number | null;
    followers?: number | null;
    genres: string[];
    url?: string | null;
  } | null;
  youtubeChannels: ManagerArtistYoutubeChannel[];
  songs: ManagerArtistSongDetail[];
};

export type ManagerSpotifyTrackSummary = {
  id: number;
  spotifyId: string;
  name: string;
  spotifyUrl?: string | null;
  durationMs?: number | null;
  releaseDate?: string | null;
  popularity?: number | null;
  thumbnails: string[];
  createdAt: string;
  groupId?: number | null;
};

export type ManagerSpotifyGroupSummary = {
  groupId: number;
  trackCount: number;
  artistTrackCount: number;
  primaryTrack: ManagerSpotifyTrackSummary;
  tracks: ManagerSpotifyTrackSummary[];
};

export type ManagerSpotifyPanelData = {
  groups: ManagerSpotifyGroupSummary[];
  orphanTracks: ManagerSpotifyTrackSummary[];
};
