"use client";

import { useEffect, useState } from "react";

import {
  updateSong,
  deleteSong,
  fetchUnlinkedSpotifyTracks,
  fetchUnlinkedYoutubeVideos,
  fetchUnlinkedSongProposes,
  fetchLinkedYoutubeVideos,
  fetchLinkedSongProposes,
  addSpotifyTrackToSong,
  unlinkSpotifyTrack,
  linkYoutubeVideo,
  unlinkYoutubeVideo,
  createAndLinkYoutubeVideo,
  linkSongPropose,
  unlinkSongPropose,
  linkSongArtist,
  unlinkSongArtist,
  searchArtistsForLink,
  refreshSongThumbnail,
  type UnlinkedSpotifyTrack,
  type UnlinkedYoutubeVideo,
  type UnlinkedSongPropose,
  type LinkedYoutubeVideo,
  type LinkedSongPropose,
} from "../../action";
import type { ManagerArtistSongDetail, SongLinkedArtist } from "../../types";
import { useSongDialogContext, type SongEditTab } from "../song-dialog-context";
import { Field, formatViewCount, getRoleLabel } from "./song-dialog-helpers";

type ArtistSearchResult = { id: number; name: string; nameKo: string };

export function SongEditDialog() {
  const {
    artistId,
    songEditState,
    closeSongEditDialog,
    updateSong: updateSongInList,
    removeSong,
  } = useSongDialogContext();
  const { open, song, initialTab } = songEditState;
  const [activeTab, setActiveTab] = useState<SongEditTab>("info");

  // 기본 정보 상태
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleLatin, setTitleLatin] = useState("");
  const [titleJaKana, setTitleJaKana] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [catalog, setCatalog] = useState("");

  // 아티스트 상태
  const [currentArtists, setCurrentArtists] = useState<SongLinkedArtist[]>([]);
  const [selectedArtistRole, setSelectedArtistRole] = useState<
    "MAIN" | "FEATURING" | "PRODUCER" | null
  >(null);
  const [artistSearchTerm, setArtistSearchTerm] = useState("");
  const [artistSearchResults, setArtistSearchResults] = useState<
    ArtistSearchResult[]
  >([]);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 연결 데이터 상태
  const [linkedSpotifyTracks, setLinkedSpotifyTracks] = useState<
    UnlinkedSpotifyTrack[]
  >([]);
  const [unlinkedSpotifyTracks, setUnlinkedSpotifyTracks] = useState<
    UnlinkedSpotifyTrack[]
  >([]);
  const [unlinkedYoutube, setUnlinkedYoutube] = useState<
    UnlinkedYoutubeVideo[]
  >([]);
  const [unlinkedProposes, setUnlinkedProposes] = useState<
    UnlinkedSongPropose[]
  >([]);
  const [linkedYoutube, setLinkedYoutube] = useState<LinkedYoutubeVideo[]>([]);
  const [linkedProposes, setLinkedProposes] = useState<LinkedSongPropose[]>([]);

  const [isLinking, setIsLinking] = useState(false);

  // 유튜브 비디오 추가 상태
  const [newVideoId, setNewVideoId] = useState("");
  const [isAddingVideo, setIsAddingVideo] = useState(false);

  // 썸네일 상태
  const [currentThumbnail, setCurrentThumbnail] = useState<string | null>(null);
  const [isRefreshingThumbnail, setIsRefreshingThumbnail] = useState(false);

  // 삭제 상태
  const [isDeleting, setIsDeleting] = useState(false);

  // 다이얼로그 열릴 때 기본 정보 초기화
  useEffect(() => {
    if (!open || !song) return;
    setTitle(song.title ?? "");
    setTitleKo(song.titleKo ?? "");
    setTitleLatin(song.titleLatin ?? "");
    setTitleJaKana(song.titleJaKana ?? "");
    setTitleJa(song.titleJa ?? "");
    setCatalog(song.catalog ?? "");
    setCurrentThumbnail(
      song.thumbnails?.medium ?? song.thumbnails?.default ?? null,
    );
    setError(null);
    setIsSaving(false);
    setArtistSearchTerm("");
    setArtistSearchResults([]);
    setSelectedArtistRole(null);
  }, [open, song?.id]);

  // 탭 초기화
  useEffect(() => {
    if (!open) return;
    setActiveTab(initialTab);
  }, [open, initialTab]);

  // 연결된 아티스트 초기화
  useEffect(() => {
    if (!open || !song) return;
    setCurrentArtists(song.artists ?? []);
  }, [open, song?.artists, song?.id]);

  // 연결된 Spotify 트랙 초기화
  useEffect(() => {
    if (!open || !song) return;
    setLinkedSpotifyTracks(
      song.spotifyTracks?.map((t) => ({
        id: t.id,
        name: t.name,
        spotifyId: t.spotifyId,
        popularity: t.popularity ?? null,
        thumbnails: t.thumbnails,
      })) ?? [],
    );
  }, [open, song?.spotifyTracks, song?.id]);

  // 연결 데이터 로드
  useEffect(() => {
    if (!open || !song || !artistId) return;

    const currentArtistId = artistId;
    const currentSongId = song.id;

    async function loadLinkData() {
      try {
        const [spotifyTracks, youtube, proposes, linkedYt, linkedPr] =
          await Promise.all([
            fetchUnlinkedSpotifyTracks(currentArtistId),
            fetchUnlinkedYoutubeVideos(currentArtistId),
            fetchUnlinkedSongProposes(currentArtistId),
            fetchLinkedYoutubeVideos(currentSongId),
            fetchLinkedSongProposes(currentSongId),
          ]);
        setUnlinkedSpotifyTracks(spotifyTracks);
        setUnlinkedYoutube(youtube);
        setUnlinkedProposes(proposes);
        setLinkedYoutube(linkedYt);
        setLinkedProposes(linkedPr);
      } catch (err) {
        console.error("연결 데이터 로드 실패:", err);
      }
    }

    loadLinkData();
  }, [open, song, artistId]);

  // 아티스트 검색
  useEffect(() => {
    if (!open) return;
    if (!artistSearchTerm.trim()) {
      setArtistSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingArtist(true);
      try {
        const results = await searchArtistsForLink(artistSearchTerm);
        const linkedIds = new Set(currentArtists.map((artist) => artist.id));
        setArtistSearchResults(
          results.filter((artist) => !linkedIds.has(artist.id)),
        );
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingArtist(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [artistSearchTerm, currentArtists, open]);

  async function handleSave() {
    if (!song) return;

    setIsSaving(true);
    setError(null);
    try {
      const updatedSong = await updateSong({
        songId: song.id,
        title,
        titleKo,
        titleLatin,
        titleJaKana,
        titleJa,
        catalog,
      });

      updateSongInList(updatedSong as ManagerArtistSongDetail);
      closeSongEditDialog();
    } catch (err) {
      console.error(err);
      setError("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLinkArtist(artistId: number) {
    if (!song) return;
    setError(null);
    try {
      const updatedArtists = await linkSongArtist({
        songId: song.id,
        artistId,
        role: selectedArtistRole,
      });
      setCurrentArtists(updatedArtists);
      const updatedSong: ManagerArtistSongDetail = {
        ...song,
        artists: updatedArtists,
      };
      updateSongInList(updatedSong);
      setArtistSearchTerm("");
      setArtistSearchResults([]);
      setSelectedArtistRole(null);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "아티스트 연결에 실패했습니다.");
    }
  }

  async function handleUnlinkArtist(artistId: number, artistName: string) {
    if (!song) return;
    const confirmed = window.confirm(
      `"${artistName}" 아티스트 연결을 삭제하시겠습니까?`,
    );
    if (!confirmed) return;

    setError(null);
    try {
      const updatedArtists = await unlinkSongArtist({
        songId: song.id,
        artistId,
      });
      setCurrentArtists(updatedArtists);
      const updatedSong: ManagerArtistSongDetail = {
        ...song,
        artists: updatedArtists,
      };
      updateSongInList(updatedSong);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "아티스트 연결 삭제에 실패했습니다.");
    }
  }

  // 스포티파이 트랙 연결
  async function handleLinkSpotifyTrack(trackId: number) {
    if (!song) return;
    setIsLinking(true);
    try {
      await addSpotifyTrackToSong(song.id, trackId);
      const track = unlinkedSpotifyTracks.find((t) => t.id === trackId);
      if (track) {
        setLinkedSpotifyTracks((prev) => [...prev, track]);
        setUnlinkedSpotifyTracks((prev) => prev.filter((t) => t.id !== trackId));
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "스포티파이 트랙 연결 실패");
    } finally {
      setIsLinking(false);
    }
  }

  // 스포티파이 트랙 연결 해제
  async function handleUnlinkSpotifyTrack(trackId: number) {
    if (!song) return;
    setIsLinking(true);
    try {
      await unlinkSpotifyTrack(trackId);
      const track = linkedSpotifyTracks.find((t) => t.id === trackId);
      if (track) {
        setUnlinkedSpotifyTracks((prev) =>
          [...prev, track].sort(
            (a, b) => (b.popularity ?? -1) - (a.popularity ?? -1),
          ),
        );
        setLinkedSpotifyTracks((prev) => prev.filter((t) => t.id !== trackId));
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "스포티파이 트랙 연결 해제 실패");
    } finally {
      setIsLinking(false);
    }
  }

  // 유튜브 연결
  async function handleLinkYoutube(videoId: string) {
    if (!song) return;
    setIsLinking(true);
    try {
      await linkYoutubeVideo(song.id, videoId);
      const video = unlinkedYoutube.find((v) => v.videoId === videoId);
      if (video) {
        setLinkedYoutube((prev) => [...prev, video]);
        setUnlinkedYoutube((prev) => prev.filter((v) => v.videoId !== videoId));
      }
    } catch (err) {
      console.error(err);
      setError("유튜브 연결 실패");
    } finally {
      setIsLinking(false);
    }
  }

  async function handleUnlinkYoutube(videoId: string) {
    if (!song) return;
    setIsLinking(true);
    try {
      await unlinkYoutubeVideo(song.id, videoId);
      const video = linkedYoutube.find((v) => v.videoId === videoId);
      if (video) {
        setUnlinkedYoutube((prev) =>
          [...prev, video].sort((a, b) => {
            const viewA = Number(a.viewCount ?? 0);
            const viewB = Number(b.viewCount ?? 0);
            return viewB - viewA;
          }),
        );
        setLinkedYoutube((prev) => prev.filter((v) => v.videoId !== videoId));
      }
    } catch (err) {
      console.error(err);
      setError("유튜브 연결 해제 실패");
    } finally {
      setIsLinking(false);
    }
  }

  // 유튜브 비디오 추가
  async function handleAddYoutubeVideo() {
    if (!song || !newVideoId.trim()) return;
    setIsAddingVideo(true);
    setError(null);
    try {
      const newVideo = await createAndLinkYoutubeVideo(song.id, newVideoId.trim());
      setLinkedYoutube((prev) => [...prev, newVideo]);
      setNewVideoId("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "유튜브 비디오 추가 실패");
    } finally {
      setIsAddingVideo(false);
    }
  }

  // 신청곡 연결
  async function handleLinkPropose(proposeId: number) {
    if (!song) return;
    setIsLinking(true);
    try {
      await linkSongPropose(song.id, proposeId);
      const propose = unlinkedProposes.find((p) => p.id === proposeId);
      if (propose) {
        setLinkedProposes((prev) =>
          [...prev, propose].sort((a, b) => b.hit - a.hit),
        );
        setUnlinkedProposes((prev) => prev.filter((p) => p.id !== proposeId));
      }
    } catch (err) {
      console.error(err);
      setError("신청곡 연결 실패");
    } finally {
      setIsLinking(false);
    }
  }

  async function handleUnlinkPropose(proposeId: number) {
    if (!song) return;
    setIsLinking(true);
    try {
      await unlinkSongPropose(proposeId);
      const propose = linkedProposes.find((p) => p.id === proposeId);
      if (propose) {
        setUnlinkedProposes((prev) =>
          [...prev, propose].sort((a, b) => b.hit - a.hit),
        );
        setLinkedProposes((prev) => prev.filter((p) => p.id !== proposeId));
      }
    } catch (err) {
      console.error(err);
      setError("신청곡 연결 해제 실패");
    } finally {
      setIsLinking(false);
    }
  }

  // 썸네일 새로고침
  async function handleRefreshThumbnail(source: "spotify" | "youtube") {
    if (!song) return;
    setIsRefreshingThumbnail(true);
    setError(null);
    try {
      const result = await refreshSongThumbnail(song.id, source);
      setCurrentThumbnail(
        result.thumbnailMedium ?? result.thumbnailDefault ?? null,
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "썸네일 새로고침 실패");
    } finally {
      setIsRefreshingThumbnail(false);
    }
  }

  // 곡 삭제
  async function handleDelete() {
    if (!song) return;
    if (
      !confirm(
        `"${song.title}" 곡을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);
    try {
      await deleteSong(song.id);
      removeSong(song.id);
      closeSongEditDialog();
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "곡 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!open) return null;

  const linkedSpotifyCount = linkedSpotifyTracks.length;

  const tabs = [
    { id: "info" as const, label: "기본 정보" },
    { id: "artists" as const, label: `아티스트 (${currentArtists.length})` },
    {
      id: "spotify" as const,
      label: `Spotify ${linkedSpotifyCount > 0 ? `(${linkedSpotifyCount})` : ""}`,
    },
    { id: "youtube" as const, label: `YouTube (${linkedYoutube.length})` },
    { id: "propose" as const, label: `신청곡 (${linkedProposes.length})` },
    { id: "admin" as const, label: "어드민" },
  ];

  if (!open || !song || !artistId) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={closeSongEditDialog}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative z-10 w-[720px] max-w-[calc(100vw-32px)] max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h4 className="text-base font-semibold text-zinc-900">곡 편집</h4>
            <p className="mt-1 text-xs text-zinc-500">
              #{song?.id ?? "-"} · {song?.title}
            </p>
          </div>
          <button
            type="button"
            onClick={closeSongEditDialog}
            className="rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:border-zinc-300 cursor-pointer"
          >
            닫기
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-zinc-100 px-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[1px] transition cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-5 mt-4 rounded-md bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm min-h-[300px]">
          {activeTab === "info" && (
            <div className="space-y-3">
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                  disabled={isSaving}
                />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Title (KO)">
                  <input
                    value={titleKo}
                    onChange={(e) => setTitleKo(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                    disabled={isSaving}
                  />
                </Field>
                <Field label="Title (Latin)">
                  <input
                    value={titleLatin}
                    onChange={(e) => setTitleLatin(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                    disabled={isSaving}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Title (JA)">
                  <input
                    value={titleJa}
                    onChange={(e) => setTitleJa(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                    disabled={isSaving}
                  />
                </Field>
                <Field label="Title (JA Kana)">
                  <input
                    value={titleJaKana}
                    onChange={(e) => setTitleJaKana(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                    disabled={isSaving}
                  />
                </Field>
              </div>
              <Field label="Catalog">
                <select
                  value={catalog}
                  onChange={(e) => setCatalog(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300 cursor-pointer"
                  disabled={isSaving}
                >
                  <option value="">미지정</option>
                  <option value="KPOP">KPOP</option>
                  <option value="JPOP">JPOP</option>
                  <option value="POP">POP</option>
                  <option value="CPOP">CPOP</option>
                </select>
              </Field>

              {/* 썸네일 섹션 */}
              <div className="pt-3 border-t border-zinc-100">
                <div className="text-xs font-medium text-zinc-600 mb-2">
                  썸네일
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
                    {currentThumbnail ? (
                      <img
                        src={currentThumbnail}
                        alt="현재 썸네일"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-xs text-zinc-400">
                        없음
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-zinc-500">
                      썸네일을 새로고침하려면 아래 버튼을 클릭하세요.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRefreshThumbnail("spotify")}
                        disabled={
                          isRefreshingThumbnail || linkedSpotifyCount === 0
                        }
                        className="px-3 py-1.5 text-xs rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isRefreshingThumbnail
                          ? "..."
                          : "Spotify (가장 오래된 발매일)"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefreshThumbnail("youtube")}
                        disabled={
                          isRefreshingThumbnail || linkedYoutube.length === 0
                        }
                        className="px-3 py-1.5 text-xs rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isRefreshingThumbnail
                          ? "..."
                          : "YouTube (가장 높은 조회수)"}
                      </button>
                    </div>
                    {linkedSpotifyCount === 0 && linkedYoutube.length === 0 && (
                      <p className="text-xs text-amber-600">
                        Spotify 트랙이나 YouTube 비디오를 먼저 연결하세요.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "artists" && (
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-zinc-700 mb-2">
                  연결된 아티스트 ({currentArtists.length})
                </div>
                {currentArtists.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
                    연결된 아티스트가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentArtists.map((artist) => (
                      <div
                        key={artist.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2 text-xs text-zinc-600">
                          <span className="text-zinc-400">#{artist.id}</span>
                          <span className="font-medium text-zinc-900">
                            {artist.name}
                          </span>
                          <span className="text-zinc-500">
                            ({artist.nameKo || artist.name})
                          </span>
                          {artist.role && (
                            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] text-purple-700">
                              {getRoleLabel(artist.role)}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            handleUnlinkArtist(
                              artist.id,
                              artist.nameKo || artist.name,
                            )
                          }
                          className="rounded-lg border border-red-200 px-2 py-1 text-[11px] text-red-600 transition hover:bg-red-50 cursor-pointer"
                        >
                          삭제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-4 space-y-3">
                <div>
                  <div className="text-xs font-semibold text-zinc-700 mb-2">
                    역할
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedArtistRole(null)}
                      className={`rounded-full px-3 py-1 transition cursor-pointer ${
                        selectedArtistRole === null
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      없음
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedArtistRole("MAIN")}
                      className={`rounded-full px-3 py-1 transition cursor-pointer ${
                        selectedArtistRole === "MAIN"
                          ? "bg-blue-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      메인
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedArtistRole("FEATURING")}
                      className={`rounded-full px-3 py-1 transition cursor-pointer ${
                        selectedArtistRole === "FEATURING"
                          ? "bg-amber-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      피처링
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedArtistRole("PRODUCER")}
                      className={`rounded-full px-3 py-1 transition cursor-pointer ${
                        selectedArtistRole === "PRODUCER"
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                      }`}
                    >
                      프로듀서
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-zinc-700 mb-2">
                    아티스트 검색
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={artistSearchTerm}
                      onChange={(e) => setArtistSearchTerm(e.target.value)}
                      placeholder="아티스트 이름 또는 ID로 검색..."
                      className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-blue-300"
                    />
                    {isSearchingArtist && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">
                        검색중...
                      </span>
                    )}
                  </div>
                </div>

                {artistSearchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-zinc-200 bg-white">
                    {artistSearchResults.map((artist) => (
                      <button
                        key={artist.id}
                        type="button"
                        onClick={() => handleLinkArtist(artist.id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-zinc-600 transition hover:bg-zinc-50 cursor-pointer"
                      >
                        <span className="text-zinc-400">#{artist.id}</span>
                        <span className="font-medium text-zinc-900">
                          {artist.name}
                        </span>
                        <span className="text-zinc-500">({artist.nameKo})</span>
                      </button>
                    ))}
                  </div>
                )}

                {artistSearchTerm.trim() &&
                  !isSearchingArtist &&
                  artistSearchResults.length === 0 && (
                    <p className="text-xs text-zinc-500">
                      검색 결과가 없습니다.
                    </p>
                  )}
              </div>
            </div>
          )}

          {activeTab === "spotify" && (
            <div className="space-y-4">
              {/* 연결된 스포티파이 트랙 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  연결된 Spotify 트랙 ({linkedSpotifyCount})
                </h5>
                {linkedSpotifyCount === 0 ? (
                  <p className="text-xs text-zinc-400">
                    연결된 트랙이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {linkedSpotifyTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-2 rounded-lg border border-emerald-200 bg-emerald-50"
                      >
                        {track.thumbnails?.[0] && (
                          <img
                            src={track.thumbnails[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-800 truncate">
                            {track.name}
                          </p>
                          <p className="text-xs text-emerald-600">
                            인기도 {track.popularity ?? "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnlinkSpotifyTrack(track.id)}
                          disabled={isLinking}
                          className="text-xs text-red-600 hover:text-red-700 disabled:text-zinc-400 cursor-pointer"
                        >
                          해제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 미연결 스포티파이 트랙 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  미연결 Spotify 트랙 ({unlinkedSpotifyTracks.length})
                </h5>
                {unlinkedSpotifyTracks.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    미연결 트랙이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {unlinkedSpotifyTracks.map((track) => (
                      <div
                        key={track.id}
                        className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 hover:border-emerald-200"
                      >
                        {track.thumbnails?.[0] && (
                          <img
                            src={track.thumbnails[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {track.name}
                          </p>
                          <p className="text-xs text-zinc-500">
                            인기도 {track.popularity ?? "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLinkSpotifyTrack(track.id)}
                          disabled={isLinking}
                          className="text-xs text-emerald-600 hover:text-emerald-700 disabled:text-zinc-400 cursor-pointer"
                        >
                          연결
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "youtube" && (
            <div className="space-y-4">
              {/* 유튜브 비디오 추가 */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  유튜브 비디오 추가
                </h5>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVideoId}
                    onChange={(e) => setNewVideoId(e.target.value)}
                    placeholder="비디오 ID (예: dQw4w9WgXcQ)"
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-300"
                    disabled={isAddingVideo}
                  />
                  <button
                    type="button"
                    onClick={handleAddYoutubeVideo}
                    disabled={isAddingVideo || !newVideoId.trim()}
                    className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-zinc-300 cursor-pointer"
                  >
                    {isAddingVideo ? "추가 중..." : "추가"}
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  YouTube URL에서 비디오 ID를 추출하여 입력하세요. (예: youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
                </p>
              </div>

              {/* 연결된 유튜브 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  연결된 YouTube ({linkedYoutube.length})
                </h5>
                {linkedYoutube.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    연결된 비디오가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedYoutube.map((video) => (
                      <div
                        key={video.videoId}
                        className="flex items-center gap-3 p-2 rounded-lg border border-red-200 bg-red-50"
                      >
                        {video.thumbnailMedium && (
                          <img
                            src={video.thumbnailMedium}
                            alt=""
                            className="w-16 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {video.title ?? video.videoId}
                          </p>
                          <p className="text-xs text-zinc-500">
                            조회수 {formatViewCount(video.viewCount)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnlinkYoutube(video.videoId)}
                          disabled={isLinking}
                          className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          해제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 미연결 유튜브 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  미연결 YouTube ({unlinkedYoutube.length})
                </h5>
                {unlinkedYoutube.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    미연결 비디오가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {unlinkedYoutube.map((video) => (
                      <div
                        key={video.videoId}
                        className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 hover:border-red-200"
                      >
                        {video.thumbnailMedium && (
                          <img
                            src={video.thumbnailMedium}
                            alt=""
                            className="w-16 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {video.title ?? video.videoId}
                          </p>
                          <p className="text-xs text-zinc-500">
                            조회수 {formatViewCount(video.viewCount)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLinkYoutube(video.videoId)}
                          disabled={isLinking}
                          className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          연결
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "propose" && (
            <div className="space-y-4">
              {/* 연결된 신청곡 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  연결된 신청곡 ({linkedProposes.length})
                </h5>
                {linkedProposes.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    연결된 신청곡이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {linkedProposes.map((propose) => (
                      <div
                        key={propose.id}
                        className="flex items-center gap-3 p-2 rounded-lg border border-orange-200 bg-orange-50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900">
                            {propose.songTitle}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {propose.songSinger} · 추천 {propose.hit}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnlinkPropose(propose.id)}
                          disabled={isLinking}
                          className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          해제
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 미연결 신청곡 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  미연결 신청곡 ({unlinkedProposes.length})
                </h5>
                {unlinkedProposes.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    미연결 신청곡이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {unlinkedProposes.map((propose) => (
                      <div
                        key={propose.id}
                        className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 hover:border-orange-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900">
                            {propose.songTitle}
                          </p>
                          <p className="text-xs text-zinc-500">
                            {propose.songSinger} · 추천 {propose.hit}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLinkPropose(propose.id)}
                          disabled={isLinking}
                          className="text-xs text-orange-600 hover:text-orange-700 cursor-pointer"
                        >
                          연결
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "admin" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-red-100 bg-red-50/40 p-4">
                <h5 className="text-sm font-semibold text-red-700">
                  위험 작업
                </h5>
                <p className="mt-1 text-xs text-red-600">
                  곡을 삭제하면 연결된 모든 데이터가 사라지며 되돌릴 수
                  없습니다.
                </p>
                <div className="mt-4 flex flex-col gap-1 text-xs text-red-600">
                  <span>· 곡 ID: #{song?.id ?? "-"}</span>
                  <span>· 제목: {song?.title ?? "-"}</span>
                </div>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                  disabled={isSaving || isDeleting}
                >
                  {isDeleting ? "삭제 중..." : "곡 삭제"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end border-t border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeSongEditDialog}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-300 cursor-pointer"
              disabled={isSaving || isDeleting}
            >
              닫기
            </button>
            {activeTab === "info" && (
              <button
                type="button"
                onClick={handleSave}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 cursor-pointer"
                disabled={isSaving || isDeleting}
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
