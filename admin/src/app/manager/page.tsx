"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { fetchManagerArtistsBatch, resolveArtistBatchOffset } from "./action";
import { CenterSection } from "./components/center-section";
import { LeftPanel } from "./components/left-panel";
import { RightSectionPlaceholder } from "./components/right-section";
import { artistFilterOptions, type ArtistFilterId } from "./filter-options";
import {
  MANAGER_PAGE_SIZE,
  type ManagerArtistSummary,
  type ManagerSortKey,
} from "./types";
import { useManagerStore } from "./store";

export default function ManagerPage() {
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
  const selectionAnchorIndexRef = useRef<number | null>(null);
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
    selectionAnchorIndexRef.current = null;
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

  const moveSelection = useCallback(
    (direction: "up" | "down") => {
      if (!artists.length) {
        return;
      }
      const currentIndex = artists.findIndex(
        (artist) => artist.id === selectedArtistId,
      );
      const fallbackIndex = direction === "down" ? 0 : artists.length - 1;
      const resolvedIndex = currentIndex === -1 ? fallbackIndex : currentIndex;
      const nextIndex =
        direction === "down" ? resolvedIndex + 1 : resolvedIndex - 1;

      if (nextIndex < 0) {
        return;
      }

      if (nextIndex >= artists.length) {
        if (!hasMore) return;
        selectionAnchorIndexRef.current = nextIndex;
        loadMore();
        return;
      }

      const nextArtist = artists[nextIndex];
      if (nextArtist) {
        setSelectedArtistId(nextArtist.id);
      }
    },
    [artists, hasMore, loadMore, selectedArtistId, setSelectedArtistId],
  );

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveSelection("down");
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection("up");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [moveSelection]);

  useEffect(() => {
    const targetIndex = selectionAnchorIndexRef.current;
    if (targetIndex === null) {
      return;
    }
    if (targetIndex < artists.length) {
      const target = artists[targetIndex];
      if (target) {
        setSelectedArtistId(target.id);
        selectionAnchorIndexRef.current = null;
      }
    }
  }, [artists, setSelectedArtistId]);

  useEffect(() => {
    if (typeof window === "undefined" || selectedArtistId === null) {
      return;
    }
    window.history.replaceState(null, "", `#${selectedArtistId}`);
  }, [selectedArtistId]);

  useEffect(() => {
    if (selectedArtistId === null) {
      return;
    }
    const cardElement = document.getElementById(
      `artist-card-${selectedArtistId}`,
    );
    cardElement?.scrollIntoView({ block: "nearest" });
  }, [selectedArtistId, artists.length]);

  return (
    <div className="min-h-screen bg-zinc-50 px-4 py-8 text-zinc-900">
      <div className="mx-auto flex flex-col gap-6 lg:gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-widest text-zinc-500">
            Admin / Manager
          </p>
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-bold">아티스트 관리자</h1>
              <p className="text-zinc-500">
                왼쪽에서 아티스트를 선택하면 중앙/오른쪽 패널에 정보가 노출될
                예정입니다.
              </p>
            </div>
            <div className="text-sm text-zinc-500">
              총 {totalArtistCount.toLocaleString()}명의 아티스트
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-blue-400 hover:text-blue-600 cursor-pointer"
            >
              대시보드 바로가기
            </Link>
            <span className="text-xs text-zinc-400">
              http://localhost:3002/ 로 이동
            </span>
          </div>
        </header>

        <div className="grid gap-6 lg:[grid-template-columns:420px_minmax(0,1fr)_320px]">
          <LeftPanel
            artists={artists}
            totalArtistCount={totalArtistCount}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            sortKey={sortKey}
            onSortKeyChange={setSortKey}
            selectedFilters={selectedFilters}
            onFiltersChange={setSelectedFilters}
            isLoading={isLoading}
            errorMessage={errorMessage}
            onRequestMore={loadMore}
            hasMore={hasMore}
            filters={artistFilterOptions}
          />

          <CenterSection />

          <RightSectionPlaceholder />
        </div>
      </div>
    </div>
  );
}
