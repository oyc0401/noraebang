"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ArtistDetailsDto, SongDto } from "@/api/model/models";
import { CircleThumbnail } from "@/components/common/CircleThumbnail";
import { SongCard } from "@/components/song/SongCard";
import { Youtube, Music, MicVocal } from "lucide-react";

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

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      setSelectedSongId(hash);
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, []);

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
    <div className="min-h-screen">
      <header className="bg-gradient-to-b from-zinc-900 to-black px-4 pt-8 pb-12">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/"
            className="text-zinc-400 hover:text-white mb-6 inline-block"
          >
            ← 홈으로
          </Link>

          <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
            <CircleThumbnail
              src={artist.thumbnailMedium || artist.thumbnailDefault}
              alt={artist.nameKo}
              size="w-32 h-32"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-4xl font-bold text-white mb-2">
                {artist.nameKo}
              </h1>
              <p className="text-xl text-zinc-400">{artist.name}</p>
              <div className="flex items-center gap-4 mt-3 text-zinc-400 justify-center sm:justify-start">
                {artist.songCount !== undefined && artist.songCount !== null && (
                  <span className="flex items-center gap-1.5">
                    <Music size={14} />
                    <span>곡 {artist.songCount}개</span>
                  </span>
                )}
                <div className="flex gap-3">
                  {artist.youtube?.channelId && (
                    <a
                      href={`https://youtube.com/channel/${artist.youtube.channelId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-red-500"
                      aria-label="YouTube channel"
                    >
                      <Youtube size={18} />
                    </a>
                  )}
                  {artist.tjSongRequestUrl && (
                    <a
                      href={artist.tjSongRequestUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 hover:text-blue-500"
                      aria-label="TJ Karaoke song request"
                    >
                      <MicVocal size={18} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="곡명으로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 text-zinc-50 placeholder-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-500/30"
          />
        </div>

        {filteredSongs.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-400 text-lg">검색 결과가 없습니다.</p>
            <p className="text-zinc-500 mt-2">
              다른 검색어를 입력해 보세요.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSongs.map((song) => (
              <div
                key={song.id}
                id={song.id.toString()}
                className="scroll-mt-4"
              >
                <SongCard
                  song={song}
                  isSelected={selectedSongId === song.id.toString()}
                  onClick={() => {
                    const newHash = `#${song.id}`;
                    window.history.replaceState(null, "", newHash);
                    setSelectedSongId(song.id.toString());
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
