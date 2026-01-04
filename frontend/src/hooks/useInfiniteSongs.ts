"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { songsControllerFindByArtistId } from "@/api/model/songs/songs";

export const useInfiniteSongs = (artistId: number) => {
  return useInfiniteQuery({
    queryKey: ["songs", "artist", artistId, "infinite"],
    queryFn: ({ pageParam }) =>
      songsControllerFindByArtistId(artistId.toString(), {
        page: pageParam.toString(),
        limit: "20",
      }),
    getNextPageParam: (lastPage) => {
      const hasMore = lastPage.meta?.hasMore;
      const nextPage = (lastPage.meta?.page ?? 0) + 1;
      return hasMore ? nextPage : undefined;
    },
    initialPageParam: 1,
  });
};
