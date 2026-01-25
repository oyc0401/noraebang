import { useCallback } from "react";
import { customFetch } from "@/api/client";

interface SaveSearchClickParams {
  query?: string;
  url?: string;
  artistId?: number;
  songId?: number;
  source?: string;
}

export function useSearchTracking() {
  const saveSearchClick = useCallback((params: SaveSearchClickParams) => {
    // fire-and-forget
    customFetch({
      url: "/search/click",
      method: "POST",
      data: params,
    }).catch(() => {
      // 실패해도 무시
    });
  }, []);

  return { saveSearchClick };
}
