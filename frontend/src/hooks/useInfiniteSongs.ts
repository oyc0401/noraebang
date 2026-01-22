"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { songsControllerFindByArtistId } from "@/api/model/songs/songs";
import { ARTIST_SONGS_PAGE_SIZE } from "@/app/artist/[slug]/constants";

export const useInfiniteSongs = (artistId: number) => {
  return useInfiniteQuery({
    queryKey: ["songs", "artist", artistId, "infinite"],
    queryFn: ({ pageParam }) =>
      songsControllerFindByArtistId(artistId, {
        page: pageParam.toString(),
        limit: `${ARTIST_SONGS_PAGE_SIZE}`,
      }),
    getNextPageParam: (lastPage) => {
      const hasMore = lastPage.meta?.hasMore;
      const nextPage = (lastPage.meta?.page ?? 0) + 1;
      return hasMore ? nextPage : undefined;
    },
    initialPageParam: 1,
  });
};
