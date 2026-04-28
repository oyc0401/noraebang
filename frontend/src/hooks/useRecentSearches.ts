import { useCallback, useEffect, useState } from "react";
import {
  deleteRecentSearch as deleteFromDB,
  getRecentSearches,
  saveRecentSearch as saveToDB,
} from "@/lib/recentSearches";

export function useRecentSearches() {
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const load = useCallback(async () => {
    const items = await getRecentSearches();
    setRecentSearches(items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveRecentSearch = useCallback(
    async (query: string) => {
      await saveToDB(query);
      await load();
    },
    [load],
  );

  const deleteRecentSearch = useCallback(
    async (query: string) => {
      await deleteFromDB(query);
      await load();
    },
    [load],
  );

  return { recentSearches, saveRecentSearch, deleteRecentSearch };
}
