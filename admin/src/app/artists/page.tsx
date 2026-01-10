"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArtistDetailSection } from "./ArtistDetailSection";
import { ArtistListSection } from "./ArtistListSection";
import { SpotifyTracksSection } from "./SpotifyTracksSection";
import { useArtistsStore } from "./store";

export default function AdminArtistsPage() {
  const {
    searchQuery,
    debouncedSearch,
    selectedArtist,
    artists,
    pendingArtistId,
    message,
    sort,
    setSearchQuery,
    setDebouncedSearch,
    setSelectedArtist,
    setPendingArtistId,
    loadArtists,
    loadArtistById,
    loadSongs,
    loadSpotifyTracks,
    resetDialogStates,
  } = useArtistsStore();

  // Debounce search query
  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchQuery, setDebouncedSearch]);

  // Load artists when debounced search or sort changes
  useEffect(() => {
    loadArtists();
  }, [debouncedSearch, sort, loadArtists]);

  // Load songs when selected artist changes
  useEffect(() => {
    if (!selectedArtist) return;
    loadSongs(selectedArtist.id);
  }, [selectedArtist, loadSongs]);

  // Load Spotify tracks when selected artist changes
  useEffect(() => {
    if (!selectedArtist) return;
    loadSpotifyTracks(selectedArtist.id);
  }, [selectedArtist, loadSpotifyTracks]);

  // Reset dialog states when selected artist changes
  useEffect(() => {
    resetDialogStates();
  }, [selectedArtist, resetDialogStates]);

  // Initial URL hash parsing
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash) {
      const artistId = Number.parseInt(hash.replace("#", ""), 10);
      if (Number.isFinite(artistId) && artistId > 0) {
        setPendingArtistId(artistId);
      }
    }
  }, [setPendingArtistId]);

  // Load artist by ID from pending
  useEffect(() => {
    if (!pendingArtistId || selectedArtist) return;
    loadArtistById(pendingArtistId);
  }, [pendingArtistId, selectedArtist, loadArtistById]);

  // Update URL hash when artist is selected
  useEffect(() => {
    if (selectedArtist) {
      window.history.replaceState(null, "", `#${selectedArtist.id}`);

      // Scroll to selected artist
      const element = document.getElementById(`artist-${selectedArtist.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedArtist]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!artists || artists.length === 0) return;

      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();

        const currentIndex = selectedArtist
          ? artists.findIndex((a) => a.id === selectedArtist.id)
          : -1;

        let nextIndex: number;
        if (e.key === "ArrowDown" || e.key === "ArrowRight") {
          nextIndex = currentIndex < artists.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : artists.length - 1;
        }

        setSelectedArtist(artists[nextIndex]);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [artists, selectedArtist, setSelectedArtist]);

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
          aria-label="관리자 대시보드로 돌아가기"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className="h-5 w-5"
          >
            <path
              d="M15 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            Artist & Songs 관리
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            아티스트와 곡을 관리합니다
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="아티스트 검색..."
          className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500"
        />
      </div>

      {/* Message */}
      {message && (
        <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3">
          <div
            className={`rounded-lg p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      {/* 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        <ArtistListSection />
        <ArtistDetailSection />
        <SpotifyTracksSection />
      </div>
    </div>
  );
}
