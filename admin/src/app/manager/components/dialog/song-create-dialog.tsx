"use client";

import { useEffect, useState } from "react";

import {
  createSong,
  fetchUnlinkedSpotifyGroups,
  fetchUnlinkedSpotifyTracks,
  getSpotifyGroupDetail,
  fetchUnlinkedYoutubeVideos,
  fetchUnlinkedSongProposes,
  linkSpotifyGroup,
  addSpotifyTrackToSong,
  linkYoutubeVideo,
  createAndLinkYoutubeVideo,
  linkSongPropose,
  linkSongArtist,
  unlinkSongArtist,
  searchArtistsForLink,
  type UnlinkedSpotifyGroup,
  type UnlinkedSpotifyTrack,
  type UnlinkedYoutubeVideo,
  type UnlinkedSongPropose,
  type SpotifyGroupEditData,
  refreshSongThumbnail,
} from "../../action";
import type { ManagerArtistSongDetail } from "../../types";
import { useManagerStore } from "../../store";
import { useSongDialogContext } from "../song-dialog-context";
import { Field, formatViewCount, getRoleLabel } from "./song-dialog-helpers";

type SongCreateTab = "info" | "artists" | "spotify" | "youtube" | "propose";
type ArtistSearchResult = { id: number; name: string; nameKo: string };

export function SongCreateDialog() {
  const { artistId, artistInfo, addSong } = useSongDialogContext();
  const isOpen = useManagerStore((state) => state.songCreateDialogOpen);
  const initialTitle = useManagerStore((state) => state.songCreateInitialTitle);
  const initialSpotifyGroupId = useManagerStore(
    (state) => state.songCreateInitialSpotifyGroupId,
  );
  const closeSongCreateDialog = useManagerStore(
    (state) => state.closeSongCreateDialog,
  );
  const artistName = artistInfo?.name;
  const artistNameKo = artistInfo?.nameKo;
  const artistCatalog = artistInfo?.catalog;
  const open = isOpen;
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
  const [unlinkedSpotifyTracks, setUnlinkedSpotifyTracks] = useState<
    UnlinkedSpotifyTrack[]
  >([]);
  const [selectedSpotifyGroupDetail, setSelectedSpotifyGroupDetail] =
    useState<SpotifyGroupEditData | null>(null);
  const [selectedSpotifyTrackIds, setSelectedSpotifyTrackIds] = useState<
    number[]
  >([]);
  const [unlinkedYoutube, setUnlinkedYoutube] = useState<
    UnlinkedYoutubeVideo[]
  >([]);
  const [unlinkedProposes, setUnlinkedProposes] = useState<
    UnlinkedSongPropose[]
  >([]);

  // 유튜브 비디오 직접 추가
  const [newVideoId, setNewVideoId] = useState("");

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

  // 스포티파이 그룹 선택 시 제목 자동 채우기
  const handleSelectSpotify = (groupId: number) => {
    setSelectedSpotifyGroupId(groupId);
    setSelectedSpotifyTrackIds([]); // 그룹 선택 시 트랙 선택 초기화
    const group = unlinkedSpotify.find((g) => g.groupId === groupId);
    if (group?.primaryTrack?.name) {
      analyzeAndFillTitle(group.primaryTrack.name);
    }
  };

  // 스포티파이 트랙 선택 (그룹 없이 트랙만 선택)
  const handleSelectSpotifyTrack = (trackId: number) => {
    if (selectedSpotifyGroupId) return; // 이미 그룹이 선택된 경우 무시
    const track = unlinkedSpotifyTracks.find((t) => t.id === trackId);
    if (track) {
      setSelectedSpotifyTrackIds((prev) => [...prev, trackId]);
      analyzeAndFillTitle(track.name);
    }
  };

  const handleDeselectSpotifyTrack = (trackId: number) => {
    setSelectedSpotifyTrackIds((prev) => prev.filter((id) => id !== trackId));
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
    setSelectedSpotifyGroupDetail(null);
    setSelectedSpotifyTrackIds([]);
    setSelectedYoutubeVideoIds([]);
    setSelectedProposeIds([]);
    setThumbnailSource(null);
    setNewVideoId("");
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
        const [spotify, spotifyTracks, youtube, proposes] = await Promise.all([
          fetchUnlinkedSpotifyGroups(id),
          fetchUnlinkedSpotifyTracks(id),
          fetchUnlinkedYoutubeVideos(id),
          fetchUnlinkedSongProposes(id),
        ]);
        setUnlinkedSpotify(spotify);
        setUnlinkedSpotifyTracks(spotifyTracks);
        setUnlinkedYoutube(youtube);
        setUnlinkedProposes(proposes);
      } catch (err) {
        console.error("미연결 데이터 로드 실패:", err);
      }
    }

    loadData();
  }, [open, artistId]);

  // 선택된 스포티파이 그룹 상세 정보 로드
  useEffect(() => {
    if (!open || !selectedSpotifyGroupId) {
      setSelectedSpotifyGroupDetail(null);
      return;
    }

    async function loadGroupDetail() {
      try {
        const detail = await getSpotifyGroupDetail(selectedSpotifyGroupId!);
        setSelectedSpotifyGroupDetail(detail);
      } catch (err) {
        console.error("그룹 상세 정보 로드 실패:", err);
        setSelectedSpotifyGroupDetail(null);
      }
    }

    loadGroupDetail();
  }, [open, selectedSpotifyGroupId]);

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

      // 3. 스포티파이 그룹 연결 또는 트랙으로 새 그룹 생성
      if (selectedSpotifyGroupId) {
        try {
          await linkSpotifyGroup(newSong.id, selectedSpotifyGroupId);
        } catch (err) {
          console.error("스포티파이 연결 실패:", err);
        }
      } else if (selectedSpotifyTrackIds.length > 0) {
        // 선택된 트랙들로 새 그룹 생성 (첫 번째 트랙으로 그룹 생성 후 나머지 추가)
        for (const trackId of selectedSpotifyTrackIds) {
          try {
            await addSpotifyTrackToSong(newSong.id, trackId);
          } catch (err) {
            console.error(`스포티파이 트랙 ${trackId} 추가 실패:`, err);
          }
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

      // 4-1. 직접 입력한 유튜브 비디오 추가
      if (newVideoId.trim()) {
        try {
          await createAndLinkYoutubeVideo(newSong.id, newVideoId.trim());
        } catch (err) {
          console.error("유튜브 비디오 추가 실패:", err);
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

      addSong(newSong);
      closeSongCreateDialog();
    } catch (err) {
      console.error(err);
      setError("곡 생성에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!open) return null;

  const spotifyCount = selectedSpotifyGroupId ? 1 : selectedSpotifyTrackIds.length;
  const youtubeCount = selectedYoutubeVideoIds.length + (newVideoId.trim() ? 1 : 0);

  const tabs = [
    { id: "info" as const, label: "기본 정보" },
    { id: "artists" as const, label: `아티스트 (${selectedArtists.length})` },
    {
      id: "spotify" as const,
      label: `Spotify ${spotifyCount ? `(${spotifyCount})` : ""}`,
    },
    {
      id: "youtube" as const,
      label: `YouTube ${youtubeCount ? `(${youtubeCount})` : ""}`,
    },
    {
      id: "propose" as const,
      label: `신청곡 ${selectedProposeIds.length ? `(${selectedProposeIds.length})` : ""}`,
    },
  ];

  if (!open || !artistId) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      onMouseDown={closeSongCreateDialog}
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
            onClick={closeSongCreateDialog}
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
                    {thumbnailSource === "spotify" && spotifyCount > 0 ? (
                      (() => {
                        // 그룹이 선택된 경우
                        if (selectedSpotifyGroupId) {
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
                        }
                        // 트랙이 선택된 경우
                        if (selectedSpotifyTrackIds.length > 0) {
                          const track = unlinkedSpotifyTracks.find(
                            (t) => t.id === selectedSpotifyTrackIds[0],
                          );
                          const thumb = track?.thumbnails?.[0];
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
                        }
                        return (
                          <span className="flex items-center justify-center w-full h-full text-xs text-zinc-400">
                            없음
                          </span>
                        );
                      })()
                    ) : thumbnailSource === "youtube" && youtubeCount > 0 ? (
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
                            {newVideoId.trim() ? "생성 후 적용" : "없음"}
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
                        disabled={spotifyCount === 0}
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
                        disabled={youtubeCount === 0}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          thumbnailSource === "youtube"
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-red-200 bg-white text-red-600 hover:bg-red-50"
                        }`}
                      >
                        YouTube (가장 높은 조회수)
                      </button>
                    </div>
                    {spotifyCount === 0 && youtubeCount === 0 && (
                      <p className="text-xs text-amber-600">
                        Spotify 그룹/트랙이나 YouTube 비디오를 먼저 선택하세요.
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
              {/* 선택된 스포티파이 그룹 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-zinc-700">
                    선택된 Spotify 그룹
                    {selectedSpotifyGroupDetail && ` (${selectedSpotifyGroupDetail.tracks.length}트랙)`}
                  </h5>
                  {selectedSpotifyGroupId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSpotifyGroupId(null);
                        setSelectedSpotifyGroupDetail(null);
                      }}
                      className="text-xs text-red-600 hover:text-red-700 cursor-pointer"
                    >
                      선택 해제
                    </button>
                  )}
                </div>
                {selectedSpotifyGroupId ? (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 overflow-hidden">
                    <div className="px-3 py-2 bg-emerald-100 text-xs text-emerald-700">
                      {selectedSpotifyGroupDetail?.tracks?.[0]?.name ?? `그룹 #${selectedSpotifyGroupId}`}
                    </div>
                    {selectedSpotifyGroupDetail ? (
                      <div className="divide-y divide-emerald-100">
                        {selectedSpotifyGroupDetail.tracks.map((track) => (
                          <div
                            key={track.id}
                            className="flex items-center gap-3 px-3 py-2"
                          >
                            {track.thumbnails?.[0] && (
                              <img
                                src={track.thumbnails[0]}
                                alt=""
                                className="w-8 h-8 rounded object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-emerald-800 truncate">
                                {track.name}
                              </p>
                              <p className="text-[11px] text-emerald-600">
                                인기도 {track.popularity ?? "-"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-center text-xs text-emerald-600">
                        로딩 중...
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">
                    선택된 그룹이 없습니다.
                  </p>
                )}
              </div>

              {/* 선택된 스포티파이 트랙 (그룹 없이) */}
              {selectedSpotifyTrackIds.length > 0 && !selectedSpotifyGroupId && (
                <div>
                  <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                    선택된 Spotify 트랙 ({selectedSpotifyTrackIds.length})
                  </h5>
                  <p className="text-[11px] text-zinc-500 mb-2">
                    곡 생성 시 새 그룹이 생성됩니다.
                  </p>
                  <div className="space-y-2">
                    {selectedSpotifyTrackIds.map((trackId) => {
                      const track = unlinkedSpotifyTracks.find((t) => t.id === trackId);
                      if (!track) return null;
                      return (
                        <div
                          key={trackId}
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
                            onClick={() => handleDeselectSpotifyTrack(trackId)}
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

              {/* 미연결 스포티파이 그룹 */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  미연결 Spotify 그룹 ({unlinkedSpotify.length})
                </h5>
                {unlinkedSpotify.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    미연결 그룹이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
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
                            disabled={!!selectedSpotifyGroupId || selectedSpotifyTrackIds.length > 0}
                            className="text-xs text-emerald-600 hover:text-emerald-700 disabled:text-zinc-400 cursor-pointer"
                          >
                            선택
                          </button>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* 미연결 스포티파이 트랙 (그룹에 속하지 않은 트랙) */}
              <div>
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  미연결 Spotify 트랙 ({unlinkedSpotifyTracks.length})
                </h5>
                <p className="text-[11px] text-zinc-500 mb-2">
                  그룹에 속하지 않은 트랙입니다. 선택하면 곡 생성 시 새 그룹이 생성됩니다.
                </p>
                {unlinkedSpotifyTracks.length === 0 ? (
                  <p className="text-xs text-zinc-400">
                    미연결 트랙이 없습니다.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {unlinkedSpotifyTracks
                      .filter((t) => !selectedSpotifyTrackIds.includes(t.id))
                      .map((track) => (
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
                            onClick={() => handleSelectSpotifyTrack(track.id)}
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
              {/* 유튜브 비디오 직접 추가 */}
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <h5 className="text-xs font-semibold text-zinc-700 mb-2">
                  유튜브 비디오 직접 추가
                </h5>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newVideoId}
                    onChange={(e) => setNewVideoId(e.target.value)}
                    placeholder="비디오 ID (예: dQw4w9WgXcQ)"
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-red-300"
                    disabled={isSaving}
                  />
                  {newVideoId.trim() && (
                    <button
                      type="button"
                      onClick={() => setNewVideoId("")}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100 cursor-pointer"
                    >
                      취소
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[11px] text-zinc-500">
                  YouTube URL에서 비디오 ID를 추출하여 입력하세요. (예: youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
                </p>
                {newVideoId.trim() && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    곡 생성 시 이 비디오가 자동으로 추가됩니다.
                  </p>
                )}
              </div>

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
            {spotifyCount > 0 && (
              <span className="mr-2">
                Spotify {selectedSpotifyGroupId ? "그룹 1개" : `트랙 ${spotifyCount}개`}
              </span>
            )}
            {youtubeCount > 0 && (
              <span className="mr-2">
                YouTube {youtubeCount}개
              </span>
            )}
            {selectedProposeIds.length > 0 && (
              <span>신청곡 {selectedProposeIds.length}개</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeSongCreateDialog}
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
