import { customFetch } from "../client";
import type { SongDto } from "../model/models";

export interface YoutubeSongSearchResponse {
  data: SongDto | null;
  message?: string | null;
}

export const searchSongByYoutubeUrl = (params: { url: string }) => {
  return customFetch<YoutubeSongSearchResponse>({
    url: "/search/youtube",
    method: "GET",
    params,
  });
};
