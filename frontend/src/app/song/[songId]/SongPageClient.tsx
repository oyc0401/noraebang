"use client";

import { useState } from "react";
import { useInView } from "react-intersection-observer";
import {
  MessageSquarePlus,
  SendHorizonal,
  ThumbsUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { SongDto } from "@/api/model/models";
import { SearchOverlay } from "@/components/common/SearchOverlay";
import { formatSongTitle } from "@/lib/formatSongTitle";
import { useSearchStore } from "@/store/searchStore";
import { useReportDialogStore } from "@/store/reportDialogStore";
import { useSongProposeDialogStore } from "@/store/songProposeDialogStore";
import SpotifyIcon from "@/icons/spotify-filled.svg";
import YoutubeMusicIcon from "@/icons/youtube-music-filled.svg";
import { SongHeader } from "./SongHeader";
import { SongProfileHeader } from "./SongProfileHeader";

interface SongPageClientProps {
  song: SongDto;
}

export default function SongPageClient({ song }: SongPageClientProps) {
  const { isSearchActive } = useSearchStore();
  const { ref: headerRef, inView: isHeaderVisible } = useInView();
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const mainArtist =
    song.artists.find((a) => a.role === "MAIN") ?? song.artists[0];
  const featArtists = song.artists.filter((a) => a.role === "FEATURING");
  const hasTjNumber = !!song.tjSong?.id;

  const formattedTitle = formatSongTitle(
    song.title,
    song.titleKo,
    song.titleJa,
    song.titleLatin,
  );

  const formatViewCount = (count: number): string => {
    if (count >= 100000000) {
      return `${Math.floor(count / 100000000)}억`;
    }
    if (count >= 10000) {
      return `${Math.floor(count / 10000)}만`;
    }
    if (count >= 1000) {
      return `${Math.floor(count / 1000)}천`;
    }
    return `${count}`;
  };

  // 상세 정보가 있는지 확인 (발음, TJ 정보, 추천수)
  const hasDetailInfo =
    song.titleJaPronu ||
    song.titleLatinPronu ||
    song.tjSong?.title ||
    song.tjSong?.artist ||
    song.tjSong?.publishdate ||
    song.tjSong?.lyricist ||
    song.tjSong?.composer ||
    song.bestSongPropose;

  if (isSearchActive) {
    return <SearchOverlay />;
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-dark text-white">
      <div className="fixed top-0 left-0 right-0 z-20 max-w-lg mx-auto">
        <SongHeader transparent={isHeaderVisible} />
      </div>
      <SongProfileHeader song={song} />
      <div ref={headerRef} />

      {/* 기본 정보 */}
      <div className="px-5 pt-5 pb-3">
        {/* 아티스트 + TJ 번호 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {mainArtist && (
              <Link
                href={`/artist/${mainArtist.slug ?? mainArtist.artistId}`}
                className="text-white text-sm font-medium hover:text-primary transition-colors"
              >
                {mainArtist.nameKo || mainArtist.name}
              </Link>
            )}
            {featArtists.map((artist) => (
              <Link
                key={artist.artistId}
                href={`/artist/${artist.slug ?? artist.artistId}`}
                className="text-gray-400 text-sm hover:text-primary transition-colors"
              >
                feat. {artist.nameKo || artist.name}
              </Link>
            ))}
          </div>
          {hasTjNumber && (
            <span className="text-[#CE8FED] text-sm font-semibold shrink-0">
              TJ {song.tjSong?.id}
            </span>
          )}
        </div>
        {/* 제목 정보 (항상 표시) */}
        {(song.title !== formattedTitle || song.titleKo || song.titleLatin) && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
            {song.title !== formattedTitle && (
              <>
                <span className="text-gray-500">원제</span>
                <span className="text-gray-300">{song.title}</span>
              </>
            )}
            {song.titleKo && (
              <>
                <span className="text-gray-500">한국어</span>
                <span className="text-gray-300">{song.titleKo}</span>
              </>
            )}
            {song.titleLatin && (
              <>
                <span className="text-gray-500">영어</span>
                <span className="text-gray-300">{song.titleLatin}</span>
              </>
            )}
          </div>
        )}

        {/* 상세 정보 토글 */}
        {hasDetailInfo && (
          <button
            type="button"
            onClick={() => setIsDetailOpen(!isDetailOpen)}
            className="flex items-center gap-1 mt-3 text-gray-400 text-xs hover:text-white transition-colors cursor-pointer"
          >
            <span>상세 정보</span>
            {isDetailOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
        )}

        {/* 상세 정보 (접기/펼치기) */}
        {isDetailOpen && hasDetailInfo && (
          <div className="mt-3 pt-3 border-t border-white/10 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {song.titleJaPronu && (
              <>
                <span className="text-gray-500">일어 발음</span>
                <span className="text-gray-300">{song.titleJaPronu}</span>
              </>
            )}
            {song.titleLatinPronu && (
              <>
                <span className="text-gray-500">영어 발음</span>
                <span className="text-gray-300">{song.titleLatinPronu}</span>
              </>
            )}
            {song.tjSong?.title && (
              <>
                <span className="text-gray-500">TJ 곡명</span>
                <span className="text-gray-300">{song.tjSong.title}</span>
              </>
            )}
            {song.tjSong?.artist && (
              <>
                <span className="text-gray-500">TJ 가수</span>
                <span className="text-gray-300">{song.tjSong.artist}</span>
              </>
            )}
            {song.tjSong?.publishdate && (
              <>
                <span className="text-gray-500">TJ 발매</span>
                <span className="text-gray-300">{song.tjSong.publishdate}</span>
              </>
            )}
            {song.tjSong?.lyricist && (
              <>
                <span className="text-gray-500">작사</span>
                <span className="text-gray-300">{song.tjSong.lyricist}</span>
              </>
            )}
            {song.tjSong?.composer && (
              <>
                <span className="text-gray-500">작곡</span>
                <span className="text-gray-300">{song.tjSong.composer}</span>
              </>
            )}
            {song.bestSongPropose && (
              <>
                <span className="text-gray-500">추천수</span>
                <span className="text-[#C1B369]">{song.bestSongPropose.hit}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* YouTube Music 섹션 */}
      {song.youtubeVideos && song.youtubeVideos.length > 0 && (
        <div className="py-4">
          <div className="flex items-center gap-2 mb-3 px-5">
            <Image
              src={YoutubeMusicIcon}
              alt="YouTube Music"
              width={20}
              height={20}
            />
            <h3 className="text-white text-sm font-semibold">YouTube Music</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5">
            {song.youtubeVideos.map((video) => (
              <a
                key={video.videoId}
                href={`https://music.youtube.com/watch?v=${video.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[140px] shrink-0 cursor-pointer group"
              >
                <div className="relative aspect-square w-full rounded-md bg-gray-700 overflow-hidden">
                  {video.thumbnailMedium && (
                    <Image
                      src={video.thumbnailMedium}
                      alt={video.title ?? formattedTitle}
                      fill
                      sizes="140px"
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-white line-clamp-2 leading-tight">
                    {video.title ?? formattedTitle}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {video.channelName ?? mainArtist?.name}
                    {video.viewCount && ` · ${formatViewCount(video.viewCount)}`}
                    {video.publishedYear && ` · ${video.publishedYear}`}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Spotify 섹션 */}
      {song.spotifyTracks && song.spotifyTracks.length > 0 && (
        <div className="py-4">
          <div className="flex items-center gap-2 mb-3 px-5">
            <Image src={SpotifyIcon} alt="Spotify" width={20} height={20} />
            <h3 className="text-white text-sm font-semibold">Spotify</h3>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5">
            {song.spotifyTracks.map((track) => (
              <a
                key={track.spotifyId}
                href={`https://open.spotify.com/track/${track.spotifyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-[140px] shrink-0 cursor-pointer group"
              >
                <div className="relative aspect-square w-full rounded-md bg-gray-700 overflow-hidden">
                  {track.thumbnails[0] && (
                    <Image
                      src={track.thumbnails[0]}
                      alt={track.name}
                      fill
                      sizes="140px"
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium text-white line-clamp-2 leading-tight">
                    {track.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {track.artistName ?? mainArtist?.name}
                    {track.popularity !== undefined && ` · 인기 ${track.popularity}`}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* TJ 추천 현황 */}
      {song.songProposes && song.songProposes.length > 0 && (
        <div className="px-5 py-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            TJ 추천 현황
          </h3>
          <div className="flex flex-col gap-2">
            {song.songProposes.map((propose, index) => {
              const startDate = new Date(propose.saveDate);
              const endDate = new Date(
                propose.saveDate + 90 * 24 * 60 * 60 * 1000,
              );
              const formatDate = (d: Date) =>
                `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;

              return (
                <a
                  key={`${propose.songTitle}-${propose.saveDate}-${index}`}
                  href={`https://www.tjmedia.com/song/accompaniment_apply?pageNo=1&dt_code=30&singer=${encodeURIComponent(mainArtist?.name ?? "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-white text-sm">{propose.name}</span>
                    <span className="text-[#C1B369] text-sm font-medium">
                      추천 {propose.hit}
                    </span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {formatDate(startDate)} ~ {formatDate(endDate)}
                  </span>
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* 구분선 */}
      <div className="h-px bg-white/5 mx-5 my-1" />

      {/* 액션 버튼 섹션 */}
      <div className="px-3 pb-10">
        {/* TJ 추천하기 */}
        {!hasTjNumber && song.bestSongPropose && (
          <a
            href={`https://www.tjmedia.com/song/accompaniment_apply?pageNo=1&dt_code=30&singer=${encodeURIComponent(mainArtist?.name ?? "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-3 w-full rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          >
            <ThumbsUp className="size-5 text-gray-500" />
            <span className="text-gray-300 text-sm">TJ 노래 추천하기</span>
            <span className="text-[#C1B369] text-sm ml-auto">
              {song.bestSongPropose.hit}
            </span>
          </a>
        )}

        {/* 노래 신청하기 */}
        {!hasTjNumber && !song.bestSongPropose && (
          <button
            type="button"
            className="flex items-center gap-3 px-3 py-3 w-full rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
            onClick={() => {
              useSongProposeDialogStore.getState().openDialog({
                songTitle: song.title,
                artistName: mainArtist?.name ?? "",
              });
            }}
          >
            <SendHorizonal className="size-5 text-gray-500" />
            <span className="text-gray-300 text-sm">노래 신청하기</span>
          </button>
        )}

        {/* 정보 개선하기 */}
        <button
          type="button"
          className="flex items-center gap-3 px-3 py-3 w-full rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          onClick={() => {
            useReportDialogStore.getState().openDialog({
              songId: song.id,
              songTitle: formattedTitle,
              artistName: mainArtist?.nameKo ?? mainArtist?.name ?? "",
              artistId: mainArtist?.artistId,
            });
          }}
        >
          <MessageSquarePlus className="size-5 text-gray-500" />
          <span className="text-gray-300 text-sm">정보 개선하기</span>
        </button>
      </div>
    </div>
  );
}
