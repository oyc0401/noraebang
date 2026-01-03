"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ArtistDetailsDto, SongDto } from "@/api/model/models";

interface ArtistPageClientProps {
  artist: ArtistDetailsDto;
  initialSongs: SongDto[];
}

export default function ArtistPageClient({
  artist,
  initialSongs,
}: ArtistPageClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [songs] = useState<SongDto[]>(initialSongs);

  // Handle hash navigation on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const songId = hash.replace("#", "");
      setSelectedSongId(songId);
      const element = document.getElementById(songId);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, []);

  // Filter songs based on search query
  const filteredSongs = searchQuery.trim()
    ? songs.filter(
        (song) =>
          song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (song.titleKo ?? "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : songs;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← 아티스트 목록으로
          </Link>
        </div>

        <header className="mb-12">
          <h1 className="mb-2 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
            {artist.name}
          </h1>
          <p className="text-xl text-zinc-600 dark:text-zinc-400">
            {artist.nameKo}
          </p>
        </header>

        <div className="mb-8 space-y-4">
          <input
            type="text"
            placeholder="곡명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-500 dark:focus:border-zinc-400"
          />
          <div className="flex flex-wrap gap-3">
            {artist.youtube && (
              <a
                href={`https://www.youtube.com/channel/${artist.youtube.channelId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-xl border border-red-200 bg-gradient-to-br from-red-50 to-red-100 px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition-all hover:border-red-300 hover:shadow-md active:scale-[0.98] dark:border-red-900 dark:from-red-950 dark:to-red-900 dark:text-red-300 dark:hover:border-red-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  role="img"
                  aria-label="YouTube"
                >
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                유튜브 채널
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100"
                  role="img"
                  aria-label="External link"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            )}
            {artist.tjSongRequestUrl && (
              <a
                href={artist.tjSongRequestUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm transition-all hover:border-blue-300 hover:shadow-md active:scale-[0.98] dark:border-blue-900 dark:from-blue-950 dark:to-blue-900 dark:text-blue-300 dark:hover:border-blue-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className="h-4 w-4 transition-transform group-hover:rotate-90"
                  role="img"
                  aria-label="Plus"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                노래 추가하기
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-3.5 w-3.5 opacity-50 transition-opacity group-hover:opacity-100"
                  role="img"
                  aria-label="External link"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {filteredSongs.length === 0 ? (
            <div className="text-center text-zinc-600 dark:text-zinc-400">
              검색 결과가 없습니다
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isSelected = selectedSongId === song.id.toString();

              return (
                <button
                  type="button"
                  key={song.id}
                  id={song.id.toString()}
                  onClick={(e) => {
                    e.preventDefault();
                    const newHash = `#${song.id}`;
                    window.history.replaceState(null, "", newHash);
                    setSelectedSongId(song.id.toString());
                  }}
                  className={`w-full text-left rounded-lg border p-6 shadow-sm transition-all scroll-mt-8 cursor-pointer ${
                    isSelected
                      ? "border-blue-500 bg-blue-50 shadow-lg ring-2 ring-blue-500 ring-opacity-50 dark:border-blue-400 dark:bg-blue-950 dark:ring-blue-400"
                      : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
                  }`}
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      {song.title}
                    </h2>
                    {song.titleKo && (
                      <p className="mt-1 text-zinc-600 dark:text-zinc-400">
                        {song.titleKo}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {song.karaokeSongs?.map((karaoke) => (
                      <div
                        key={`${karaoke.provider}-${karaoke.karaokeNo}`}
                        className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-3 py-1 text-sm dark:bg-zinc-800"
                      >
                        <span
                          className={`font-semibold ${
                            karaoke.provider === "TJ"
                              ? "text-blue-600 dark:text-blue-400"
                              : karaoke.provider === "KY"
                                ? "text-green-600 dark:text-green-400"
                                : "text-purple-600 dark:text-purple-400"
                          }`}
                        >
                          {karaoke.provider}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {karaoke.karaokeNo}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
