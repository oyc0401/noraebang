import type { ManagerArtistSummary } from "./types";

export type ArtistFilterDefinition = {
  id: string;
  label: string;
  description?: string;
  predicate: (artist: ManagerArtistSummary) => boolean;
};

export const artistFilterOptions: ArtistFilterDefinition[] = [
  {
    id: "hasSongs",
    label: "곡이 있는 아티스트만",
    description: "songCount > 0",
    predicate: (artist) => (artist?.songCount ?? 0) > 0,
  },
  {
    id: "noSongs",
    label: "곡이 없는 아티스트만",
    description: "songCount === 0",
    predicate: (artist) => (artist?.songCount ?? 0) === 0,
  },
  {
    id: "jpopOnly",
    label: "JPOP 분류만",
    predicate: (artist) =>
      (artist?.catalog ?? "").toUpperCase() === "JPOP",
  },
  {
    id: "missingCatalog",
    label: "분류가 없는 아티스트",
    predicate: (artist) =>
      !artist?.catalog || String(artist.catalog).toLowerCase() === "none",
  },
  {
    id: "popularOnSpotify",
    label: "스포티파이 인기 상위 20%",
    predicate: (artist) => (artist?.popularity ?? 0) >= 80,
  },
  {
    id: "noYoutubeTopic",
    label: "유튜브 토픽 없는 아티스트",
    description: "TOPIC 타입 채널이 없는 아티스트",
    predicate: () => true, // 서버 필터링만 사용
  },
];

export type ArtistFilterId = (typeof artistFilterOptions)[number]["id"];
