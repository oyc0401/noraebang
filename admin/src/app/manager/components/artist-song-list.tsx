"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createSong,
  fetchManagerArtistSongs,
  fetchManagerArtistInfo,
  updateSong,
  deleteSong,
  fetchUnlinkedSpotifyGroups,
  fetchUnlinkedYoutubeVideos,
  fetchUnlinkedSongProposes,
  fetchLinkedYoutubeVideos,
  fetchLinkedSongProposes,
  linkSpotifyGroup,
  unlinkSpotifyGroup,
  linkYoutubeVideo,
  unlinkYoutubeVideo,
  linkSongPropose,
  unlinkSongPropose,
  linkSongArtist,
  unlinkSongArtist,
  searchArtistsForLink,
  refreshSongThumbnail,
  type UnlinkedSpotifyGroup,
  type UnlinkedYoutubeVideo,
  type UnlinkedSongPropose,
  type LinkedYoutubeVideo,
  type LinkedSongPropose,
} from "../action";
import type { ManagerArtistSongDetail, SongLinkedArtist } from "../types";
import { useManagerStore } from "../store";
import { SongCard } from "./song-card";

type SongEditTab =
  | "info"
  | "artists"
  | "spotify"
  | "youtube"
  | "propose"
  | "admin";
type ArtistSearchResult = { id: number; name: string; nameKo: string };

type SongSortType = "popularity-desc" | "popularity-asc" | "tj-first";

export function ArtistSongList() {
  const selectedArtistId = useManagerStore((state) => state.selectedArtistId);
  const selectedGroupId = useManagerStore((state) => state.selectedGroupId);
  const setSelectedGroupId = useManagerStore(
    (state) => state.setSelectedGroupId,
  );

  const [songs, setSongs] = useState<ManagerArtistSongDetail[]>([]);
  const [artistInfo, setArtistInfo] = useState<{
    name: string;
    nameKo: string;
    catalog?: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  // 정렬 상태
  const [sortType, setSortType] = useState<SongSortType>("popularity-desc");

  // 곡 편집 다이얼로그 상태
  const [isSongEditOpen, setIsSongEditOpen] = useState(false);
  const [editingSong, setEditingSong] =
    useState<ManagerArtistSongDetail | null>(null);
  const [editInitialTab, setEditInitialTab] = useState<SongEditTab>("info");

  // 곡 추가 다이얼로그 상태 (store에서 가져옴)
  const isSongCreateOpen = useManagerStore(
    (state) => state.songCreateDialogOpen,
  );
  const songCreateInitialTitle = useManagerStore(
    (state) => state.songCreateInitialTitle,
  );
  const songCreateInitialSpotifyGroupId = useManagerStore(
    (state) => state.songCreateInitialSpotifyGroupId,
  );
  const openSongCreateDialog = useManagerStore(
    (state) => state.openSongCreateDialog,
  );
  const closeSongCreateDialog = useManagerStore(
    (state) => state.closeSongCreateDialog,
  );

  useEffect(() => {
    if (!selectedArtistId) {
      setSongs([]);
      setArtistInfo(null);
      setErrorMessage(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setSongs([]);

    const fetchId = fetchIdRef.current + 1;
    fetchIdRef.current = fetchId;

    async function run() {
      if (!selectedArtistId) return;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [songsResponse, infoResponse] = await Promise.all([
          fetchManagerArtistSongs(selectedArtistId),
          fetchManagerArtistInfo(selectedArtistId),
        ]);
        if (cancelled || fetchId !== fetchIdRef.current) {
          return;
        }
        setSongs(songsResponse?.songs ?? []);
        if (infoResponse) {
          setArtistInfo({
            name: infoResponse.name,
            nameKo: infoResponse.nameKo,
            catalog: infoResponse.catalog,
          });
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setErrorMessage("곡 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedArtistId]);

  // selectedGroupId가 현재 곡 목록에 없으면 초기화
  useEffect(() => {
    if (
      selectedGroupId &&
      !songs.some((song) => song.spotifyGroup?.id === selectedGroupId)
    ) {
      setSelectedGroupId(null);
    }
  }, [songs, selectedGroupId, setSelectedGroupId]);

  const sortedSongs = useMemo(() => {
    return [...songs].sort((a, b) => {
      // 스포티파이 연결 없으면 -1 (0보다 낮음)
      const popA = a.spotifyGroup?.primaryTrack?.popularity ?? -1;
      const popB = b.spotifyGroup?.primaryTrack?.popularity ?? -1;

      if (sortType === "popularity-desc") {
        // 스포티파이 인기순 (높은순)
        if (popA !== popB) return popB - popA;
        const releaseA = a.spotifyGroup?.primaryTrack?.releaseDate ?? "";
        const releaseB = b.spotifyGroup?.primaryTrack?.releaseDate ?? "";
        return releaseA.localeCompare(releaseB);
      }

      if (sortType === "popularity-asc") {
        // 스포티파이 인기순 (낮은순)
        if (popA !== popB) return popA - popB;
        const releaseA = a.spotifyGroup?.primaryTrack?.releaseDate ?? "";
        const releaseB = b.spotifyGroup?.primaryTrack?.releaseDate ?? "";
        return releaseA.localeCompare(releaseB);
      }

      // tj-first: TJ곡 유무 우선
      const tjA = a.karaoke.length > 0 ? 1 : 0;
      const tjB = b.karaoke.length > 0 ? 1 : 0;
      if (tjA !== tjB) return tjB - tjA;
      if (popA !== popB) return popB - popA;
      const releaseA = a.spotifyGroup?.primaryTrack?.releaseDate ?? "";
      const releaseB = b.spotifyGroup?.primaryTrack?.releaseDate ?? "";
      return releaseA.localeCompare(releaseB);
    });
  }, [songs, sortType]);

  // 선택된 그룹으로 스크롤
  useEffect(() => {
    if (!songs.length || !selectedGroupId) {
      return;
    }
    const targetSong = sortedSongs.find(
      (song) => song.spotifyGroup?.id === selectedGroupId,
    );
    if (targetSong) {
      const element = document.getElementById(`song-card-${targetSong.id}`);
      element?.scrollIntoView({ block: "nearest" });
    }
  }, [sortedSongs, selectedGroupId]);

  if (!selectedArtistId) {
    return null;
  }

  if (isLoading && songs.length === 0) {
    return (
      <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
        <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900 border-b border-gray-200">
          전체 곡 목록
        </h3>
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
          곡 목록을 불러오는 중...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
        <h3 className="flex-shrink-0 px-4 py-4 text-lg font-semibold text-zinc-900 border-b border-gray-200">
          전체 곡 목록
        </h3>
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-xl border border-dashed border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-1 min-h-0 flex-col overflow-hidden">
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-zinc-900">
            전체 곡 목록 ({songs.length.toLocaleString()})
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={sortType}
              onChange={(e) => setSortType(e.target.value as SongSortType)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-zinc-700 cursor-pointer"
            >
              <option value="popularity-desc">스포티파이 인기순</option>
              <option value="popularity-asc">인기 낮은순</option>
              <option value="tj-first">TJ곡 우선</option>
            </select>
            <button
              type="button"
              onClick={() => openSongCreateDialog()}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition hover:bg-blue-100 cursor-pointer"
            >
              + 곡 추가
            </button>
          </div>
        </div>
        <div className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto pr-2">
          {sortedSongs.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-200 px-4 py-6 text-center text-sm text-zinc-500">
              아직 등록된 곡이 없습니다.
            </div>
          )}

          {sortedSongs.map((song) => (
            <SongCard
              key={song.id}
              song={song}
              isGroupSelected={
                Boolean(song.spotifyGroup?.id) &&
                song.spotifyGroup?.id === selectedGroupId
              }
              onSelectGroup={setSelectedGroupId}
              onEditClick={(s, options) => {
                setEditingSong(s);
                setEditInitialTab(options?.focusTab ?? "info");
                setIsSongEditOpen(true);
              }}
            />
          ))}
        </div>
      </div>

      {/* 곡 편집 다이얼로그 */}
      <SongEditDialog
        open={isSongEditOpen}
        song={editingSong}
        artistId={selectedArtistId}
        initialTab={editInitialTab}
        onOpenChange={(open) => {
          setIsSongEditOpen(open);
          if (!open) setEditingSong(null);
        }}
        onSongUpdated={(updatedSong) => {
          setSongs((prev) =>
            prev.map((s) => (s.id === updatedSong.id ? updatedSong : s)),
          );
        }}
        onSongDeleted={(songId) => {
          setSongs((prev) => prev.filter((s) => s.id !== songId));
        }}
      />

      {/* 곡 추가 다이얼로그 */}
      <SongCreateDialog
        open={isSongCreateOpen}
        artistId={selectedArtistId}
        artistName={artistInfo?.name}
        artistNameKo={artistInfo?.nameKo}
        artistCatalog={artistInfo?.catalog}
        initialTitle={songCreateInitialTitle}
        initialSpotifyGroupId={songCreateInitialSpotifyGroupId}
        onOpenChange={(open) => {
          if (!open) closeSongCreateDialog();
        }}
        onSongCreated={(newSong) => {
          setSongs((prev) => [newSong, ...prev]);
        }}
      />
    </>
  );
}

function SongEditDialog({
  open,
  song,
  artistId,
  initialTab,
  onOpenChange,
  onSongUpdated,
  onSongDeleted,
}: {
  open: boolean;
  song: ManagerArtistSongDetail | null;
  artistId: number | null;
  initialTab: SongEditTab;
  onOpenChange: (open: boolean) => void;
  onSongUpdated: (song: ManagerArtistSongDetail) => void;
  onSongDeleted: (songId: number) => void;
}) {
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
  const [unlinkedSpotify, setUnlinkedSpotify] = useState<
    UnlinkedSpotifyGroup[]
  >([]);
  const [unlinkedYoutube, setUnlinkedYoutube] = useState<
    UnlinkedYoutubeVideo[]
  >([]);
  const [unlinkedProposes, setUnlinkedProposes] = useState<
    UnlinkedSongPropose[]
  >([]);
  const [linkedYoutube, setLinkedYoutube] = useState<LinkedYoutubeVideo[]>([]);
  const [linkedProposes, setLinkedProposes] = useState<LinkedSongPropose[]>([]);
  const [currentSpotifyGroupId, setCurrentSpotifyGroupId] = useState<
    number | null
  >(null);

  const [isLinking, setIsLinking] = useState(false);

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
    setCurrentSpotifyGroupId(song.spotifyGroup?.id ?? null);
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

  // 연결 데이터 로드
  useEffect(() => {
    if (!open || !song || !artistId) return;

    async function loadLinkData() {
      try {
        const [spotify, youtube, proposes, linkedYt, linkedPr] =
          await Promise.all([
            fetchUnlinkedSpotifyGroups(artistId),
            fetchUnlinkedYoutubeVideos(artistId),
            fetchUnlinkedSongProposes(artistId),
            fetchLinkedYoutubeVideos(song.id),
            fetchLinkedSongProposes(song.id),
          ]);
        setUnlinkedSpotify(spotify);
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

      onSongUpdated(updatedSong as ManagerArtistSongDetail);
      onOpenChange(false);
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
      onSongUpdated(updatedSong);
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
      onSongUpdated(updatedSong);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "아티스트 연결 삭제에 실패했습니다.");
    }
  }

  // 스포티파이 연결
  async function handleLinkSpotify(groupId: number) {
    if (!song) return;
    setIsLinking(true);
    try {
      await linkSpotifyGroup(song.id, groupId);
      setCurrentSpotifyGroupId(groupId);
      setUnlinkedSpotify((prev) => prev.filter((g) => g.groupId !== groupId));
    } catch (err) {
      console.error(err);
      setError("스포티파이 연결 실패");
    } finally {
      setIsLinking(false);
    }
  }

  async function handleUnlinkSpotify() {
    if (!song || !currentSpotifyGroupId) return;
    setIsLinking(true);
    try {
      const oldGroupId = currentSpotifyGroupId;
      await unlinkSpotifyGroup(song.id);
      // 해제된 그룹을 미연결 목록에 다시 추가하기 위해 다시 로드
      if (artistId) {
        const spotify = await fetchUnlinkedSpotifyGroups(artistId);
        setUnlinkedSpotify(spotify);
      }
      setCurrentSpotifyGroupId(null);
    } catch (err) {
      console.error(err);
      setError("스포티파이 연결 해제 실패");
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
      onSongDeleted(song.id);
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message ?? "곡 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  if (!open) return null;

  const tabs = [
    { id: "info" as const, label: "기본 정보" },
    { id: "artists" as const, label: `아티스트 (${currentArtists.length})` },
    {
      id: "spotify" as const,
      label: `Spotify ${currentSpotifyGroupId ? "(1)" : ""}`,
    },
    { id: "youtube" as const, label: `YouTube (${linkedYoutube.length})` },
    { id: "propose" as const, label: `신청곡 (${linkedProposes.length})` },
    { id: "admin" as const, label: "어드민" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onOpenChange(false)}
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
            onClick={() => onOpenChange(false)}
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
                          isRefreshingThumbnail || !currentSpotifyGroupId
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
                    {!currentSpotifyGroupId && linkedYoutube.length === 0 && (
                      <p className="text-xs text-amber-600">
                        Spotify 그룹이나 YouTube 비디오를 먼저 연결하세요.
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
              {/* 현재 연결된 스포티파이 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  연결된 Spotify 그룹
                </h5>
                {currentSpotifyGroupId ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                    {song?.spotifyGroup?.primaryTrack?.thumbnails?.[0] && (
                      <img
                        src={song.spotifyGroup.primaryTrack.thumbnails[0]}
                        alt=""
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-800">
                        {song?.spotifyGroup?.primaryTrack?.name ??
                          `그룹 #${currentSpotifyGroupId}`}
                      </p>
                      <p className="text-xs text-emerald-600">
                        그룹 #{currentSpotifyGroupId} · 인기도{" "}
                        {song?.spotifyGroup?.primaryTrack?.popularity ?? "-"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleUnlinkSpotify}
                      disabled={isLinking}
                      className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      연결 해제
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">
                    연결된 그룹이 없습니다.
                  </p>
                )}
              </div>

              {/* 미연결 스포티파이 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  미연결 Spotify 그룹 ({unlinkedSpotify.length})
                </h5>
                {unlinkedSpotify.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    미연결 그룹이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {unlinkedSpotify.map((group) => (
                      <div
                        key={group.groupId}
                        className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 hover:border-emerald-200"
                      >
                        {group.primaryTrack?.thumbnails?.[0] && (
                          <img
                            src={group.primaryTrack.thumbnails[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">
                            {group.primaryTrack?.name ??
                              `그룹 #${group.groupId}`}
                          </p>
                          <p className="text-xs text-zinc-500">
                            인기도 {group.primaryTrack?.popularity ?? "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleLinkSpotify(group.groupId)}
                          disabled={isLinking || !!currentSpotifyGroupId}
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
              onClick={() => onOpenChange(false)}
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

function formatViewCount(viewCount?: string | null): string {
  if (!viewCount) return "0";
  const count = Number(viewCount);
  if (Number.isNaN(count)) return viewCount;
  if (count >= 100_000_000) {
    return `${(count / 100_000_000).toFixed(1)}억`;
  }
  if (count >= 10_000) {
    return `${(count / 10_000).toFixed(1)}만`;
  }
  return count.toLocaleString();
}

function getRoleLabel(role: string): string {
  switch (role) {
    case "MAIN":
      return "메인";
    case "FEATURING":
      return "피처링";
    case "PRODUCER":
      return "프로듀서";
    default:
      return role;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-600">{label}</div>
      {children}
    </label>
  );
}

type SongCreateTab = "info" | "artists" | "spotify" | "youtube" | "propose";

function SongCreateDialog({
  open,
  artistId,
  artistName,
  artistNameKo,
  artistCatalog,
  initialTitle,
  initialSpotifyGroupId,
  onOpenChange,
  onSongCreated,
}: {
  open: boolean;
  artistId: number | null;
  artistName?: string;
  artistNameKo?: string;
  artistCatalog?: string | null;
  initialTitle?: string;
  initialSpotifyGroupId?: number | null;
  onOpenChange: (open: boolean) => void;
  onSongCreated: (song: ManagerArtistSongDetail) => void;
}) {
  const [activeTab, setActiveTab] = useState<SongCreateTab>("info");

  // 기본 정보
  const [title, setTitle] = useState("");
  const [titleKo, setTitleKo] = useState("");
  const [titleLatin, setTitleLatin] = useState("");
  const [titleJaKana, setTitleJaKana] = useState("");
  const [titleJa, setTitleJa] = useState("");
  const [catalog, setCatalog] = useState("");

  // 연결할 데이터 선택
  const [selectedSpotifyGroupId, setSelectedSpotifyGroupId] = useState<
    number | null
  >(null);
  const [selectedYoutubeVideoIds, setSelectedYoutubeVideoIds] = useState<
    string[]
  >([]);
  const [selectedProposeIds, setSelectedProposeIds] = useState<number[]>([]);

  // 아티스트 선택
  type SelectedArtist = {
    id: number;
    name: string;
    nameKo: string;
    role: "MAIN" | "FEATURING" | "PRODUCER" | null;
  };
  const [selectedArtists, setSelectedArtists] = useState<SelectedArtist[]>([]);
  const [artistSearchTerm, setArtistSearchTerm] = useState("");
  const [artistSearchResults, setArtistSearchResults] = useState<
    ArtistSearchResult[]
  >([]);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [selectedArtistRole, setSelectedArtistRole] = useState<
    "MAIN" | "FEATURING" | "PRODUCER" | null
  >(null);

  // 미연결 데이터
  const [unlinkedSpotify, setUnlinkedSpotify] = useState<
    UnlinkedSpotifyGroup[]
  >([]);
  const [unlinkedYoutube, setUnlinkedYoutube] = useState<
    UnlinkedYoutubeVideo[]
  >([]);
  const [unlinkedProposes, setUnlinkedProposes] = useState<
    UnlinkedSongPropose[]
  >([]);

  // 썸네일 소스 선택
  const [thumbnailSource, setThumbnailSource] = useState<
    "spotify" | "youtube" | null
  >(null);

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 제목 문자 분석 및 자동 채우기
  const analyzeAndFillTitle = (text: string) => {
    if (!text) return;

    const hasKorean = /[\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F]/.test(text);
    const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text);
    const hasOnlyLatin = /^[\x00-\x7F\s]+$/.test(text);

    // 한글 포함 -> titleKo
    if (hasKorean && !titleKo) {
      setTitleKo(text);
    }
    // 일본어 포함 -> titleJaKana (히라가나/가타카나) 또는 titleJa (한자/일반)
    else if (hasJapanese) {
      const hasKana = /[\u3040-\u309F\u30A0-\u30FF]/.test(text);
      const hasKanji = /[\u4E00-\u9FAF]/.test(text);
      if (hasKana && !titleJaKana) {
        setTitleJaKana(text);
      }
      if (hasKanji && !titleJa) {
        setTitleJa(text);
      }
    }
    // 라틴 문자만 -> titleLatin
    else if (hasOnlyLatin && !titleLatin) {
      setTitleLatin(text);
    }
  };

  // 스포티파이 선택 시 제목 자동 채우기
  const handleSelectSpotify = (groupId: number) => {
    setSelectedSpotifyGroupId(groupId);
    const group = unlinkedSpotify.find((g) => g.groupId === groupId);
    if (group?.primaryTrack?.name) {
      analyzeAndFillTitle(group.primaryTrack.name);
    }
  };

  // 유튜브 선택 시 제목 자동 채우기
  const handleSelectYoutube = (videoId: string) => {
    setSelectedYoutubeVideoIds((prev) => [...prev, videoId]);
    const video = unlinkedYoutube.find((v) => v.videoId === videoId);
    if (video?.title) {
      analyzeAndFillTitle(video.title);
    }
  };

  // 다이얼로그 열릴 때 초기화
  useEffect(() => {
    if (!open) return;
    setActiveTab("info");
    setTitle(initialTitle ?? "");
    setTitleKo("");
    setTitleLatin("");
    setTitleJaKana("");
    setTitleJa("");
    setCatalog(artistCatalog ?? "");
    setSelectedSpotifyGroupId(initialSpotifyGroupId ?? null);
    setSelectedYoutubeVideoIds([]);
    setSelectedProposeIds([]);
    setThumbnailSource(null);
    // 현재 아티스트를 기본 선택
    if (artistId && artistName) {
      setSelectedArtists([
        {
          id: artistId,
          name: artistName,
          nameKo: artistNameKo ?? artistName,
          role: null,
        },
      ]);
    } else {
      setSelectedArtists([]);
    }
    setArtistSearchTerm("");
    setArtistSearchResults([]);
    setSelectedArtistRole(null);
    setError(null);
    setIsSaving(false);
  }, [
    open,
    initialTitle,
    initialSpotifyGroupId,
    artistId,
    artistName,
    artistNameKo,
    artistCatalog,
  ]);

  // 미연결 데이터 로드
  useEffect(() => {
    if (!open || !artistId) return;

    const id = artistId;
    async function loadData() {
      try {
        const [spotify, youtube, proposes] = await Promise.all([
          fetchUnlinkedSpotifyGroups(id),
          fetchUnlinkedYoutubeVideos(id),
          fetchUnlinkedSongProposes(id),
        ]);
        setUnlinkedSpotify(spotify);
        setUnlinkedYoutube(youtube);
        setUnlinkedProposes(proposes);
      } catch (err) {
        console.error("미연결 데이터 로드 실패:", err);
      }
    }

    loadData();
  }, [open, artistId]);

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
        const selectedIds = new Set(selectedArtists.map((a) => a.id));
        setArtistSearchResults(results.filter((a) => !selectedIds.has(a.id)));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearchingArtist(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [artistSearchTerm, selectedArtists, open]);

  async function handleCreate() {
    if (!title.trim()) {
      setError("곡 제목은 필수입니다.");
      return;
    }
    if (selectedArtists.length === 0) {
      setError("최소 1명의 아티스트를 선택해야 합니다.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      // 1. 곡 생성 (첫 번째 아티스트로)
      const firstArtist = selectedArtists[0];
      const newSong = await createSong({
        title,
        titleKo,
        titleLatin,
        titleJa,
        titleJaKana,
        catalog,
        artistId: firstArtist.id,
      });

      // 2. 첫 번째 아티스트 역할 업데이트 및 추가 아티스트 연결
      // 첫 번째 아티스트의 역할이 있으면 업데이트
      if (firstArtist.role) {
        try {
          await unlinkSongArtist({
            songId: newSong.id,
            artistId: firstArtist.id,
          });
          await linkSongArtist({
            songId: newSong.id,
            artistId: firstArtist.id,
            role: firstArtist.role,
          });
        } catch (err) {
          console.error("첫 번째 아티스트 역할 업데이트 실패:", err);
        }
      }
      // 나머지 아티스트 연결
      for (let i = 1; i < selectedArtists.length; i++) {
        const artist = selectedArtists[i];
        try {
          await linkSongArtist({
            songId: newSong.id,
            artistId: artist.id,
            role: artist.role,
          });
        } catch (err) {
          console.error(`아티스트 ${artist.id} 연결 실패:`, err);
        }
      }

      // 3. 스포티파이 그룹 연결
      if (selectedSpotifyGroupId) {
        try {
          await linkSpotifyGroup(newSong.id, selectedSpotifyGroupId);
        } catch (err) {
          console.error("스포티파이 연결 실패:", err);
        }
      }

      // 4. 유튜브 비디오 연결
      for (const videoId of selectedYoutubeVideoIds) {
        try {
          await linkYoutubeVideo(newSong.id, videoId);
        } catch (err) {
          console.error("유튜브 연결 실패:", err);
        }
      }

      // 5. 신청곡 연결
      for (const proposeId of selectedProposeIds) {
        try {
          await linkSongPropose(newSong.id, proposeId);
        } catch (err) {
          console.error("신청곡 연결 실패:", err);
        }
      }

      // 6. 썸네일 적용
      if (thumbnailSource) {
        try {
          await refreshSongThumbnail(newSong.id, thumbnailSource);
        } catch (err) {
          console.error("썸네일 적용 실패:", err);
        }
      }

      onSongCreated(newSong);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setError("곡 생성에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  const tabs = [
    { id: "info" as const, label: "기본 정보" },
    { id: "artists" as const, label: `아티스트 (${selectedArtists.length})` },
    {
      id: "spotify" as const,
      label: `Spotify ${selectedSpotifyGroupId ? "(1)" : ""}`,
    },
    {
      id: "youtube" as const,
      label: `YouTube ${selectedYoutubeVideoIds.length ? `(${selectedYoutubeVideoIds.length})` : ""}`,
    },
    {
      id: "propose" as const,
      label: `신청곡 ${selectedProposeIds.length ? `(${selectedProposeIds.length})` : ""}`,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={() => onOpenChange(false)}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative z-10 w-[720px] max-w-[calc(100vw-32px)] max-h-[90vh] flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div>
            <h4 className="text-base font-semibold text-zinc-900">곡 추가</h4>
            <p className="mt-1 text-xs text-zinc-500">
              새로운 곡을 생성하고 연결 데이터를 선택하세요.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
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
              <Field label="Title *">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="곡 제목 (필수)"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                  disabled={isSaving}
                  autoFocus
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Title (KO)">
                  <input
                    value={titleKo}
                    onChange={(e) => setTitleKo(e.target.value)}
                    placeholder="한국어 제목"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                    disabled={isSaving}
                  />
                </Field>

                <Field label="Title (Latin)">
                  <input
                    value={titleLatin}
                    onChange={(e) => setTitleLatin(e.target.value)}
                    placeholder="로마자 제목"
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
                    placeholder="일본어 제목"
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 outline-none focus:border-blue-300"
                    disabled={isSaving}
                  />
                </Field>
                <Field label="Title (JA Kana)">
                  <input
                    value={titleJaKana}
                    onChange={(e) => setTitleJaKana(e.target.value)}
                    placeholder="일본어 가나 제목"
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

              {/* 썸네일 소스 선택 */}
              <div className="pt-3 border-t border-zinc-100">
                <div className="text-xs font-medium text-zinc-600 mb-2">
                  썸네일
                </div>
                <div className="flex items-start gap-4">
                  {/* 미리보기 */}
                  <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200">
                    {thumbnailSource === "spotify" && selectedSpotifyGroupId ? (
                      (() => {
                        const group = unlinkedSpotify.find(
                          (g) => g.groupId === selectedSpotifyGroupId,
                        );
                        const thumb = group?.primaryTrack?.thumbnails?.[0];
                        return thumb ? (
                          <img
                            src={thumb}
                            alt="Spotify 썸네일"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-xs text-zinc-400">
                            없음
                          </span>
                        );
                      })()
                    ) : thumbnailSource === "youtube" &&
                      selectedYoutubeVideoIds.length > 0 ? (
                      (() => {
                        const video = unlinkedYoutube.find(
                          (v) => v.videoId === selectedYoutubeVideoIds[0],
                        );
                        const thumb = video?.thumbnailMedium;
                        return thumb ? (
                          <img
                            src={thumb}
                            alt="YouTube 썸네일"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-xs text-zinc-400">
                            없음
                          </span>
                        );
                      })()
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-xs text-zinc-400">
                        미선택
                      </span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-zinc-500">
                      곡 생성 시 적용할 썸네일 소스를 선택하세요.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setThumbnailSource(
                            thumbnailSource === "spotify" ? null : "spotify",
                          )
                        }
                        disabled={!selectedSpotifyGroupId}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          thumbnailSource === "spotify"
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        Spotify (가장 오래된 발매일)
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setThumbnailSource(
                            thumbnailSource === "youtube" ? null : "youtube",
                          )
                        }
                        disabled={selectedYoutubeVideoIds.length === 0}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          thumbnailSource === "youtube"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                        }`}
                      >
                        YouTube (가장 높은 조회수)
                      </button>
                    </div>
                    {!selectedSpotifyGroupId &&
                      selectedYoutubeVideoIds.length === 0 && (
                        <p className="text-xs text-amber-600">
                          Spotify 그룹이나 YouTube 비디오를 먼저 선택하세요.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "artists" && (
            <div className="space-y-4">
              {/* 선택된 아티스트 */}
              <div>
                <div className="text-xs font-semibold text-zinc-700 mb-2">
                  선택된 아티스트 ({selectedArtists.length})
                </div>
                {selectedArtists.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 p-4 text-center text-xs text-zinc-500">
                    선택된 아티스트가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedArtists.map((artist) => (
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
                            setSelectedArtists((prev) =>
                              prev.filter((a) => a.id !== artist.id),
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

              {/* 역할 선택 및 검색 */}
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
                        onClick={() => {
                          setSelectedArtists((prev) => [
                            ...prev,
                            {
                              id: artist.id,
                              name: artist.name,
                              nameKo: artist.nameKo,
                              role: selectedArtistRole,
                            },
                          ]);
                          setArtistSearchTerm("");
                          setArtistSearchResults([]);
                        }}
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
              {/* 선택된 스포티파이 */}
              {selectedSpotifyGroupId && (
                <div>
                  <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                    선택된 Spotify 그룹
                  </h5>
                  {(() => {
                    const selectedGroup = unlinkedSpotify.find(
                      (g) => g.groupId === selectedSpotifyGroupId,
                    );
                    if (!selectedGroup) return null;
                    return (
                      <div className="flex items-center gap-3 p-3 rounded-lg border border-emerald-200 bg-emerald-50">
                        {selectedGroup.primaryTrack?.thumbnails?.[0] && (
                          <img
                            src={selectedGroup.primaryTrack.thumbnails[0]}
                            alt=""
                            className="w-10 h-10 rounded object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-emerald-800">
                            {selectedGroup.primaryTrack?.name ??
                              `그룹 #${selectedGroup.groupId}`}
                          </p>
                          <p className="text-xs text-emerald-600">
                            그룹 #{selectedGroup.groupId} · 인기도{" "}
                            {selectedGroup.primaryTrack?.popularity ?? "-"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedSpotifyGroupId(null)}
                          className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          선택 해제
                        </button>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 미연결 스포티파이 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  미연결 Spotify 그룹 ({unlinkedSpotify.length})
                </h5>
                {unlinkedSpotify.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    미연결 그룹이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {unlinkedSpotify
                      .filter((g) => g.groupId !== selectedSpotifyGroupId)
                      .map((group) => (
                        <div
                          key={group.groupId}
                          className="flex items-center gap-3 p-2 rounded-lg border border-zinc-200 hover:border-emerald-200"
                        >
                          {group.primaryTrack?.thumbnails?.[0] && (
                            <img
                              src={group.primaryTrack.thumbnails[0]}
                              alt=""
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">
                              {group.primaryTrack?.name ??
                                `그룹 #${group.groupId}`}
                            </p>
                            <p className="text-xs text-zinc-500">
                              인기도 {group.primaryTrack?.popularity ?? "-"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectSpotify(group.groupId)}
                            disabled={!!selectedSpotifyGroupId}
                            className="text-xs text-emerald-600 hover:text-emerald-700 disabled:text-zinc-400 cursor-pointer"
                          >
                            선택
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
              {/* 선택된 유튜브 */}
              {selectedYoutubeVideoIds.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                    선택된 YouTube ({selectedYoutubeVideoIds.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedYoutubeVideoIds.map((videoId) => {
                      const video = unlinkedYoutube.find(
                        (v) => v.videoId === videoId,
                      );
                      if (!video) return null;
                      return (
                        <div
                          key={videoId}
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
                              {video.title ?? videoId}
                            </p>
                            <p className="text-xs text-zinc-500">
                              조회수 {formatViewCount(video.viewCount)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedYoutubeVideoIds((prev) =>
                                prev.filter((id) => id !== videoId),
                              )
                            }
                            className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            해제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    {unlinkedYoutube
                      .filter(
                        (v) => !selectedYoutubeVideoIds.includes(v.videoId),
                      )
                      .map((video) => (
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
                            onClick={() => handleSelectYoutube(video.videoId)}
                            className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            선택
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
              {/* 선택된 신청곡 */}
              {selectedProposeIds.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                    선택된 신청곡 ({selectedProposeIds.length})
                  </h5>
                  <div className="space-y-2">
                    {selectedProposeIds.map((proposeId) => {
                      const propose = unlinkedProposes.find(
                        (p) => p.id === proposeId,
                      );
                      if (!propose) return null;
                      return (
                        <div
                          key={proposeId}
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
                            onClick={() =>
                              setSelectedProposeIds((prev) =>
                                prev.filter((id) => id !== proposeId),
                              )
                            }
                            className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                          >
                            해제
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    {unlinkedProposes
                      .filter((p) => !selectedProposeIds.includes(p.id))
                      .map((propose) => (
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
                            onClick={() =>
                              setSelectedProposeIds((prev) => [
                                ...prev,
                                propose.id,
                              ])
                            }
                            className="text-xs text-orange-600 hover:text-orange-700 cursor-pointer"
                          >
                            선택
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-4">
          <div className="text-xs text-zinc-500">
            {selectedSpotifyGroupId && (
              <span className="mr-2">Spotify 1개</span>
            )}
            {selectedYoutubeVideoIds.length > 0 && (
              <span className="mr-2">
                YouTube {selectedYoutubeVideoIds.length}개
              </span>
            )}
            {selectedProposeIds.length > 0 && (
              <span>신청곡 {selectedProposeIds.length}개</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-300 cursor-pointer"
              disabled={isSaving}
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCreate}
              className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400 cursor-pointer"
              disabled={isSaving || !title.trim()}
            >
              {isSaving ? "생성 중..." : "곡 추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
