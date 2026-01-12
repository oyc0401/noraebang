"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { fetchManagerArtistsBatch, resolveArtistBatchOffset } from "./action";
import type { ArtistFilterId } from "./filter-options";
import {
  MANAGER_PAGE_SIZE,
  type ManagerArtistSummary,
  type ManagerSortKey,
} from "./types";
import { useManagerStore } from "./store";

type ManagerArtistsContextValue = {
  artists: ManagerArtistSummary[];
  totalArtistCount: number;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  sortKey: ManagerSortKey;
  setSortKey: (key: ManagerSortKey) => void;
  selectedFilters: ArtistFilterId[];
  setSelectedFilters: (filters: ArtistFilterId[]) => void;
  isLoading: boolean;
  errorMessage: string | null;
  hasMore: boolean;
  loadMore: () => void;
  updateArtistSummary: (
    artistId: number,
    patch: Partial<ManagerArtistSummary>,
  ) => void;
};

const ManagerArtistsContext = createContext<ManagerArtistsContextValue | null>(
  null,
);

export function ManagerArtistsProvider({ children }: { children: ReactNode }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<ArtistFilterId[]>([]);
  const [sortKey, setSortKey] = useState<ManagerSortKey>("idAsc");
  const [artists, setArtists] = useState<ManagerArtistSummary[]>([]);
  const [totalArtistCount, setTotalArtistCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const setSelectedArtistId = useManagerStore(
    (state) => state.setSelectedArtistId,
  );
  const loadedOffsetsRef = useRef(new Set<number>());
  const nextOffsetRef = useRef(0);
  const queryKeyRef = useRef("");
  const loadingRef = useRef(false);

  const querySignature = useMemo(
    () =>
      JSON.stringify({
        searchTerm,
        sortKey,
        filters: [...selectedFilters].sort(),
      }),
    [searchTerm, sortKey, selectedFilters],
  );

  useEffect(() => {
    queryKeyRef.current = querySignature;
  }, [querySignature]);

  const loadBatch = useCallback(
    async (
      offset: number,
      options?: {
        replace?: boolean;
        anchorId?: number | null;
        expectKey?: string;
      },
    ) => {
      const expectKey = options?.expectKey ?? queryKeyRef.current;
      if (loadingRef.current && !options?.replace) {
        return;
      }
      if (!options?.replace && loadedOffsetsRef.current.has(offset)) {
        return;
      }
      loadingRef.current = true;
      setIsLoading(true);

      try {
        const response = await fetchManagerArtistsBatch({
          offset,
          limit: MANAGER_PAGE_SIZE,
          searchTerm,
          sortKey,
          filters: selectedFilters,
        });

        if (expectKey !== queryKeyRef.current) {
          return;
        }

        setErrorMessage(null);
        setTotalArtistCount(response.totalCount);
        setHasMore(response.hasMore);
        loadedOffsetsRef.current.add(response.offset);
        nextOffsetRef.current = response.offset + response.artists.length;

        if (options?.replace) {
          setArtists(response.artists);
        } else {
          setArtists((prev) => {
            if (!prev.length && response.offset === 0) {
              return response.artists;
            }
            const existingIds = new Set(prev.map((artist) => artist.id));
            const merged = response.artists.filter(
              (artist) => !existingIds.has(artist.id),
            );
            return [...prev, ...merged];
          });
        }

        const anchorId =
          options?.anchorId ??
          (options?.replace ? (response.artists[0]?.id ?? null) : null);
        if (anchorId) {
          const existsInBatch = response.artists.some(
            (artist) => artist.id === anchorId,
          );
          if (existsInBatch) {
            setSelectedArtistId(anchorId);
          }
        }
        if (!anchorId && options?.replace && response.artists.length > 0) {
          setSelectedArtistId(response.artists[0].id);
        }
      } catch (error) {
        console.error(error);
        if (expectKey === queryKeyRef.current) {
          setErrorMessage("아티스트 목록을 불러오지 못했습니다.");
          if (options?.replace) {
            setArtists([]);
            setSelectedArtistId(null);
            nextOffsetRef.current = 0;
          }
        }
      } finally {
        loadingRef.current = false;
        setIsLoading(false);
      }
    },
    [searchTerm, selectedFilters, setSelectedArtistId, sortKey],
  );

  const getHashArtistId = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const value = window.location.hash.replace("#", "");
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadedOffsetsRef.current.clear();
    nextOffsetRef.current = 0;
    setArtists([]);
    setSelectedArtistId(null);
    setHasMore(true);
    setErrorMessage(null);

    const activeKey = querySignature;

    async function bootstrap() {
      const anchorId = getHashArtistId();
      let offset = 0;

      if (anchorId) {
        const resolved = await resolveArtistBatchOffset(anchorId, {
          limit: MANAGER_PAGE_SIZE,
          searchTerm,
          sortKey,
          filters: selectedFilters,
        });
        if (cancelled || activeKey !== queryKeyRef.current) {
          return;
        }
        if (resolved.exists) {
          offset = resolved.offset;
        }
      }

      if (!cancelled) {
        await loadBatch(offset, {
          replace: true,
          anchorId,
          expectKey: activeKey,
        });
      }
    }

    bootstrap().catch((error) => {
      console.error(error);
      if (!cancelled) {
        setErrorMessage("초기 데이터를 불러오지 못했습니다.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    getHashArtistId,
    loadBatch,
    querySignature,
    searchTerm,
    selectedFilters,
    setSelectedArtistId,
    sortKey,
  ]);

  const loadMore = useCallback(() => {
    if (loadingRef.current || !hasMore) {
      return;
    }
    const nextOffset = nextOffsetRef.current;
    if (loadedOffsetsRef.current.has(nextOffset)) {
      return;
    }
    loadBatch(nextOffset, { expectKey: queryKeyRef.current });
  }, [hasMore, loadBatch]);

  useEffect(() => {
    if (typeof window === "undefined" || selectedArtistId === null) {
      return;
    }
    window.history.replaceState(null, "", `#${selectedArtistId}`);
  }, [selectedArtistId]);

  const handleSearchTermChange = useCallback((value: string) => {
    setSearchTerm(value);
  }, []);

  const handleSortKeyChange = useCallback((key: ManagerSortKey) => {
    setSortKey(key);
  }, []);

  const handleSelectedFiltersChange = useCallback(
    (filters: ArtistFilterId[]) => {
      setSelectedFilters(filters);
    },
    [],
  );

  const handleUpdateArtistSummary = useCallback(
    (artistId: number, patch: Partial<ManagerArtistSummary>) => {
      setArtists((prev) =>
        prev.map((artist) =>
          artist.id === artistId ? { ...artist, ...patch } : artist,
        ),
      );
    },
    [],
  );

  const value = useMemo<ManagerArtistsContextValue>(
    () => ({
      artists,
      totalArtistCount,
      searchTerm,
      setSearchTerm: handleSearchTermChange,
      sortKey,
      setSortKey: handleSortKeyChange,
      selectedFilters,
      setSelectedFilters: handleSelectedFiltersChange,
      isLoading,
      errorMessage,
      hasMore,
      loadMore,
      updateArtistSummary: handleUpdateArtistSummary,
    }),
    [
      artists,
      errorMessage,
      hasMore,
      isLoading,
      handleSearchTermChange,
      handleSelectedFiltersChange,
      handleSortKeyChange,
      searchTerm,
      selectedFilters,
      sortKey,
      totalArtistCount,
      loadMore,
      handleUpdateArtistSummary,
    ],
  );

  return (
    <ManagerArtistsContext.Provider value={value}>
      {children}
    </ManagerArtistsContext.Provider>
  );
}

export function useManagerArtists() {
  const context = useContext(ManagerArtistsContext);
  if (!context) {
    throw new Error(
      "useManagerArtists는 ManagerArtistsProvider 내에서만 사용할 수 있습니다.",
    );
  }
  return context;
}
