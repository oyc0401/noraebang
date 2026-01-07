"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { artistsControllerFindAllDetails } from "@/api/model/artists/artists";
import type { ArtistsControllerFindAllDetailsParams } from "@/api/model/models";

export const useInfiniteArtists = (
  sort: ArtistsControllerFindAllDetailsParams["sort"] = "subscriber_desc",
) => {
  return useInfiniteQuery({
    queryKey: ["artists", "infinite", sort],
    queryFn: ({ pageParam }) =>
      artistsControllerFindAllDetails({
        sort,
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
