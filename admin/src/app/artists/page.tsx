"use client";

import Link from "next/link";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createKaraokeSong,
  deleteKaraokeSong,
  deleteArtist,
  getArtists,
  getArtistById,
  getSongsByArtist,
  addSongOwnership,
  updateArtistAlias,
  updateArtistName,
  updateArtistNameKo,
  updateKaraokeSong,
  updateSongTitle,
  transferSongOwnership,
  mergeArtist,
  updateArtistCatalog,
} from "./actions";

const SORT_OPTIONS = [
  { value: "id_asc", label: "아이디 ↑" },
  { value: "id_desc", label: "최신" },
  { value: "name_asc", label: "이름 ↑" },
  { value: "name_desc", label: "이름 ↓" },
  { value: "song_count_desc", label: "곡 ↑" },
  { value: "song_count_asc", label: "곡 ↓" },
] as const;

type SortOption = (typeof SORT_OPTIONS)[number]["value"];
const DEFAULT_SORT: SortOption = "id_asc";

type ArtistsResponse = Awaited<ReturnType<typeof getArtists>>;
type Artist = ArtistsResponse["artists"][number];
type Song = Awaited<ReturnType<typeof getSongsByArtist>>[number];
const ARTIST_CATALOG_OPTIONS = [
  { label: "삭제", value: null as const },
  { label: "KPOP", value: "KPOP" as const },
  { label: "JPOP", value: "JPOP" as const },
  { label: "POP", value: "POP" as const },
  { label: "CPOP", value: "CPOP" as const },
] as const;
type ArtistCatalogOption = (typeof ARTIST_CATALOG_OPTIONS)[number]["value"];

export default function AdminArtistsPage() {
  const [sort, setSort] = useState<SortOption>(DEFAULT_SORT);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [artistsLoading, setArtistsLoading] = useState(true);
  const [artistsHasMore, setArtistsHasMore] = useState(false);
  const [artistsCursor, setArtistsCursor] = useState<number | undefined>(
    undefined,
  );
  const [loadingMoreArtists, setLoadingMoreArtists] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [pendingArtistId, setPendingArtistId] = useState<number | null>(null);
  const [pendingArtistLoading, setPendingArtistLoading] = useState(false);

  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [nameKoMenuOpen, setNameKoMenuOpen] = useState(false);
  const nameKoMenuRef = useRef<HTMLDivElement | null>(null);
  const [nameMenuOpen, setNameMenuOpen] = useState(false);
  const nameMenuRef = useRef<HTMLDivElement | null>(null);
  const [aliasMenuOpen, setAliasMenuOpen] = useState(false);
  const aliasMenuRef = useRef<HTMLDivElement | null>(null);
  const [catalogMenuOpen, setCatalogMenuOpen] = useState(false);
  const catalogMenuRef = useRef<HTMLDivElement | null>(null);

  const [showNameKoDialog, setShowNameKoDialog] = useState(false);
  const [nameKoInput, setNameKoInput] = useState("");
  const [nameKoSaving, setNameKoSaving] = useState(false);
  const [nameKoError, setNameKoError] = useState<string | null>(null);

  const [showNameDialog, setShowNameDialog] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const [showAliasDialog, setShowAliasDialog] = useState(false);
  const [aliasInput, setAliasInput] = useState("");
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasError, setAliasError] = useState<string | null>(null);

  // 곡 편집 관련
  const [editingSong, setEditingSong] = useState<Song | null>(null);
  const [songMenuOpen, setSongMenuOpen] = useState<number | null>(null);
  const songMenuRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const [showSongTitleDialog, setShowSongTitleDialog] = useState(false);
  const [songTitleInput, setSongTitleInput] = useState("");
  const [songTitleKoInput, setSongTitleKoInput] = useState("");
  const [songTitleSaving, setSongTitleSaving] = useState(false);
  const [songTitleError, setSongTitleError] = useState<string | null>(null);

  const [showKaraokeDialog, setShowKaraokeDialog] = useState(false);
  const [karaokeTjInput, setKaraokeTjInput] = useState("");
  const [karaokeKyInput, setKaraokeKyInput] = useState("");
  const [karaokeJoysoundInput, setKaraokeJoysoundInput] = useState("");
  const [karaokeSaving, setKaraokeSaving] = useState(false);
  const [karaokeError, setKaraokeError] = useState<string | null>(null);

  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferSong, setTransferSong] = useState<Song | null>(null);
  const [transferArtistIdInput, setTransferArtistIdInput] = useState("");
  const [transferSaving, setTransferSaving] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [showAddOwnershipDialog, setShowAddOwnershipDialog] = useState(false);
  const [addOwnershipSong, setAddOwnershipSong] = useState<Song | null>(null);
  const [addOwnershipArtistIdInput, setAddOwnershipArtistIdInput] =
    useState("");
  const [addOwnershipSaving, setAddOwnershipSaving] = useState(false);
  const [addOwnershipError, setAddOwnershipError] = useState<string | null>(
    null,
  );

  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeTargetArtistIdInput, setMergeTargetArtistIdInput] = useState("");
  const [mergeSaving, setMergeSaving] = useState(false);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [deletingArtist, setDeletingArtist] = useState(false);
  const [catalogSaving, setCatalogSaving] = useState(false);

  // 아티스트 목록 로드
  useEffect(() => {
    const handler = window.setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => window.clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    setArtistsLoading(true);
    getArtists(sort, 100, undefined, debouncedSearch)
      .then((res) => {
        setArtists(res.artists);
        setArtistsHasMore(res.hasMore);
        setArtistsCursor(res.nextCursor);
      })
      .finally(() => setArtistsLoading(false));
  }, [sort, debouncedSearch]);

  // 선택된 아티스트의 곡 목록 로드
  useEffect(() => {
    if (!selectedArtist) {
      setSongs([]);
      return;
    }

    setSongsLoading(true);
    getSongsByArtist(selectedArtist.id)
      .then(setSongs)
      .finally(() => setSongsLoading(false));
  }, [selectedArtist]);

  useEffect(() => {
    setNameKoMenuOpen(false);
    setNameMenuOpen(false);
    setAliasMenuOpen(false);
    setCatalogMenuOpen(false);
    setCatalogSaving(false);
    setShowNameKoDialog(false);
    setShowNameDialog(false);
    setShowAliasDialog(false);
    setNameKoError(null);
    setNameError(null);
    setAliasError(null);
    setNameKoInput(selectedArtist?.nameKo ?? "");
    setNameInput(selectedArtist?.name ?? "");
    setAliasInput(selectedArtist?.alias ?? "");
  }, [selectedArtist]);

  const isFilteringArtists = debouncedSearch.trim().length > 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash) {
      const artistId = Number.parseInt(hash.replace("#", ""), 10);
      if (Number.isFinite(artistId) && artistId > 0) {
        setPendingArtistId(artistId);
      }
    }
  }, []);

  // 초기 로드시 URL 해시로부터 아티스트 선택
  useEffect(() => {
    if (!pendingArtistId || selectedArtist) return;

    const existing = artists.find((a) => a.id === pendingArtistId);
    if (existing) {
      setSelectedArtist(existing);
      setPendingArtistId(null);
      return;
    }

    if (pendingArtistLoading) return;
    setPendingArtistLoading(true);
    getArtistById(pendingArtistId)
      .then((artist) => {
        if (!artist) {
          setPendingArtistId(null);
          return;
        }
        setArtists((prev) => {
          if (prev.some((a) => a.id === artist.id)) return prev;
          return [artist, ...prev];
        });
        setSelectedArtist(artist);
        setPendingArtistId(null);
      })
      .finally(() => setPendingArtistLoading(false));
  }, [pendingArtistId, artists, pendingArtistLoading, selectedArtist]);

  // 아티스트 선택시 URL 해시 업데이트
  useEffect(() => {
    if (selectedArtist) {
      window.history.replaceState(null, "", `#${selectedArtist.id}`);

      // 선택된 아티스트로 스크롤
      const element = document.getElementById(`artist-${selectedArtist.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [selectedArtist]);

  // 키보드 이벤트 핸들러
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
  }, [artists, selectedArtist]);

  useEffect(() => {
    if (!nameKoMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        nameKoMenuRef.current &&
        !nameKoMenuRef.current.contains(event.target as Node)
      ) {
        setNameKoMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [nameKoMenuOpen]);

  useEffect(() => {
    if (!nameMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        nameMenuRef.current &&
        !nameMenuRef.current.contains(event.target as Node)
      ) {
        setNameMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [nameMenuOpen]);

  useEffect(() => {
    if (!aliasMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        aliasMenuRef.current &&
        !aliasMenuRef.current.contains(event.target as Node)
      ) {
        setAliasMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [aliasMenuOpen]);

  useEffect(() => {
    if (!catalogMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        catalogMenuRef.current &&
        !catalogMenuRef.current.contains(event.target as Node)
      ) {
        setCatalogMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [catalogMenuOpen]);

  useEffect(() => {
    if (songMenuOpen === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const ref = songMenuRefs.current.get(songMenuOpen);
      if (ref && !ref.contains(event.target as Node)) {
        setSongMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [songMenuOpen]);

  const handleNameKoSave = async () => {
    if (!selectedArtist) return;

    const trimmedNameKo = nameKoInput.trim();
    if (!trimmedNameKo) {
      setNameKoError("한국어 이름을 입력해주세요.");
      return;
    }

    setNameKoSaving(true);
    setNameKoError(null);

    try {
      const response = await updateArtistNameKo(
        selectedArtist.id,
        trimmedNameKo,
      );

      setMessage({
        type: "success",
        text: `✅ 한국어 이름이 "${response.nameKo}"로 저장되었습니다.`,
      });

      const updatedArtists = await getArtists(
        sort,
        100,
        undefined,
        debouncedSearch,
      );
      setArtists(updatedArtists.artists);
      setArtistsHasMore(updatedArtists.hasMore);
      setArtistsCursor(updatedArtists.nextCursor);

      const updatedArtist = updatedArtists.artists.find(
        (a) => a.id === selectedArtist.id,
      );
      if (updatedArtist) {
        setSelectedArtist(updatedArtist);
      }

      setShowNameKoDialog(false);
      setNameKoMenuOpen(false);
    } catch (error: any) {
      setNameKoError(
        error.message ?? "한국어 이름 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setNameKoSaving(false);
    }
  };

  const handleNameSave = async () => {
    if (!selectedArtist) return;

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      setNameError("이름을 입력해주세요.");
      return;
    }

    setNameSaving(true);
    setNameError(null);

    try {
      const response = await updateArtistName(selectedArtist.id, trimmedName);

      setMessage({
        type: "success",
        text: `✅ 이름이 "${response.name}"로 저장되었습니다.`,
      });

      const updatedArtists = await getArtists(
        sort,
        100,
        undefined,
        debouncedSearch,
      );
      setArtists(updatedArtists.artists);
      setArtistsHasMore(updatedArtists.hasMore);
      setArtistsCursor(updatedArtists.nextCursor);

      const updatedArtist = updatedArtists.artists.find(
        (a) => a.id === selectedArtist.id,
      );
      if (updatedArtist) {
        setSelectedArtist(updatedArtist);
      }

      setShowNameDialog(false);
      setNameMenuOpen(false);
    } catch (error: any) {
      setNameError(error.message ?? "이름 저장 중 오류가 발생했습니다.");
    } finally {
      setNameSaving(false);
    }
  };

  const handleAliasSave = async () => {
    if (!selectedArtist) return;

    const sanitizedAlias = aliasInput.trim().replace(/^@/, "");
    if (!sanitizedAlias) {
      setAliasError("별칭을 입력해주세요.");
      return;
    }

    setAliasSaving(true);
    setAliasError(null);

    try {
      const response = await updateArtistAlias(
        selectedArtist.id,
        sanitizedAlias,
      );

      setMessage({
        type: "success",
        text: `✅ ${selectedArtist.nameKo}: @${
          response.alias ?? sanitizedAlias
        }로 저장되었습니다.`,
      });

      const updatedArtists = await getArtists(
        sort,
        100,
        undefined,
        debouncedSearch,
      );
      setArtists(updatedArtists.artists);
      setArtistsHasMore(updatedArtists.hasMore);
      setArtistsCursor(updatedArtists.nextCursor);

      const updatedArtist = updatedArtists.artists.find(
        (a) => a.id === selectedArtist.id,
      );
      if (updatedArtist) {
        setSelectedArtist(updatedArtist);
      }

      setShowAliasDialog(false);
      setAliasMenuOpen(false);
    } catch (error: any) {
      setAliasError(error.message ?? "별칭 저장 중 오류가 발생했습니다.");
    } finally {
      setAliasSaving(false);
    }
  };

  const handleSongTitleSave = async () => {
    if (!editingSong) return;

    const trimmedTitle = songTitleInput.trim();
    if (!trimmedTitle) {
      setSongTitleError("제목을 입력해주세요.");
      return;
    }

    setSongTitleSaving(true);
    setSongTitleError(null);

    try {
      await updateSongTitle(
        editingSong.id,
        trimmedTitle,
        songTitleKoInput.trim() || undefined,
      );

      setMessage({
        type: "success",
        text: `✅ 제목이 "${trimmedTitle}"로 저장되었습니다.`,
      });

      if (selectedArtist) {
        const updatedSongs = await getSongsByArtist(selectedArtist.id);
        setSongs(updatedSongs);
      }

      setShowSongTitleDialog(false);
      setSongMenuOpen(null);
    } catch (error: any) {
      setSongTitleError(error.message ?? "제목 저장 중 오류가 발생했습니다.");
    } finally {
      setSongTitleSaving(false);
    }
  };

  const handleKaraokeSave = async () => {
    if (!editingSong) return;

    setKaraokeSaving(true);
    setKaraokeError(null);

    try {
      const existingTj = editingSong.karaokeSongs.find(
        (k) => k.provider === "TJ",
      );
      const existingKy = editingSong.karaokeSongs.find(
        (k) => k.provider === "KY",
      );
      const existingJoysound = editingSong.karaokeSongs.find(
        (k) => k.provider === "JOYSOUND",
      );

      // TJ 처리
      if (karaokeTjInput.trim()) {
        if (existingTj) {
          await updateKaraokeSong(editingSong.id, "TJ", karaokeTjInput.trim());
        } else {
          await createKaraokeSong(editingSong.id, "TJ", karaokeTjInput.trim());
        }
      } else if (existingTj) {
        await deleteKaraokeSong(editingSong.id, "TJ");
      }

      // KY 처리
      if (karaokeKyInput.trim()) {
        if (existingKy) {
          await updateKaraokeSong(editingSong.id, "KY", karaokeKyInput.trim());
        } else {
          await createKaraokeSong(editingSong.id, "KY", karaokeKyInput.trim());
        }
      } else if (existingKy) {
        await deleteKaraokeSong(editingSong.id, "KY");
      }

      // JOYSOUND 처리
      if (karaokeJoysoundInput.trim()) {
        if (existingJoysound) {
          await updateKaraokeSong(
            editingSong.id,
            "JOYSOUND",
            karaokeJoysoundInput.trim(),
          );
        } else {
          await createKaraokeSong(
            editingSong.id,
            "JOYSOUND",
            karaokeJoysoundInput.trim(),
          );
        }
      } else if (existingJoysound) {
        await deleteKaraokeSong(editingSong.id, "JOYSOUND");
      }

      setMessage({
        type: "success",
        text: `✅ 노래방 번호가 저장되었습니다.`,
      });

      if (selectedArtist) {
        const updatedSongs = await getSongsByArtist(selectedArtist.id);
        setSongs(updatedSongs);
      }

      setShowKaraokeDialog(false);
      setSongMenuOpen(null);
    } catch (error: any) {
      setKaraokeError(
        error.message ?? "노래방 번호 저장 중 오류가 발생했습니다.",
      );
    } finally {
      setKaraokeSaving(false);
    }
  };

  const handleArtistCatalogChange = async (value: ArtistCatalogOption) => {
    if (!selectedArtist) return;
    if (catalogSaving) return;

    let applyToNullSongs = false;
    if (
      value &&
      songs.some((song) => !song.catalog) &&
      typeof window !== "undefined"
    ) {
      const confirmed = window.confirm(
        `해당 아티스트의 곡 중 분류가 없는 곡의 분류도 ${value}으로 수정하시겠습니까?`,
      );
      if (!confirmed) {
        return;
      }
      applyToNullSongs = true;
    }

    setCatalogSaving(true);

    try {
      await updateArtistCatalog(selectedArtist.id, value, applyToNullSongs);

      setMessage({
        type: "success",
        text: value
          ? `✅ ${selectedArtist.nameKo} 분류가 ${value}로 설정되었습니다.`
          : `✅ ${selectedArtist.nameKo} 분류가 삭제되었습니다.`,
      });

      const [updatedArtists, updatedSongs] = await Promise.all([
        getArtists(sort, 100, undefined, debouncedSearch),
        getSongsByArtist(selectedArtist.id),
      ]);

      setArtists(updatedArtists.artists);
      setArtistsHasMore(updatedArtists.hasMore);
      setArtistsCursor(updatedArtists.nextCursor);
      setSongs(updatedSongs);

      const refreshed = updatedArtists.artists.find(
        (artist) => artist.id === selectedArtist.id,
      );
      if (refreshed) {
        setSelectedArtist(refreshed);
      }
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message ?? "분류 설정 중 오류가 발생했습니다.",
      });
    } finally {
      setCatalogSaving(false);
      setCatalogMenuOpen(false);
    }
  };

  const handleTransferOwnership = async () => {
    if (!transferSong || !selectedArtist) return;
    const trimmed = transferArtistIdInput.trim();
    const targetId = Number.parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(targetId) || targetId <= 0) {
      setTransferError("이전할 아티스트 ID를 올바르게 입력해주세요.");
      return;
    }

    setTransferSaving(true);
    setTransferError(null);
    try {
      await transferSongOwnership(transferSong.id, selectedArtist.id, targetId);
      const refreshed = await getSongsByArtist(selectedArtist.id);
      setSongs(refreshed);
      setShowTransferDialog(false);
      setTransferSong(null);
      setTransferArtistIdInput("");
    } catch (error: any) {
      setTransferError(error?.message ?? "소유권 이전 중 오류가 발생했습니다.");
    } finally {
      setTransferSaving(false);
    }
  };

  const handleAddOwnership = async () => {
    if (!addOwnershipSong) return;
    const trimmed = addOwnershipArtistIdInput.trim();
    const targetId = Number.parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(targetId) || targetId <= 0) {
      setAddOwnershipError("추가할 아티스트 ID를 올바르게 입력해주세요.");
      return;
    }

    setAddOwnershipSaving(true);
    setAddOwnershipError(null);
    try {
      await addSongOwnership(addOwnershipSong.id, targetId);
      if (selectedArtist) {
        const refreshed = await getSongsByArtist(selectedArtist.id);
        setSongs(refreshed);
      }
      setShowAddOwnershipDialog(false);
      setAddOwnershipSong(null);
      setAddOwnershipArtistIdInput("");
    } catch (error: any) {
      setAddOwnershipError(
        error?.message ?? "소유권 추가 중 오류가 발생했습니다.",
      );
    } finally {
      setAddOwnershipSaving(false);
    }
  };

  const handleLoadMoreArtists = useCallback(async () => {
    if (!artistsHasMore || loadingMoreArtists || isFilteringArtists) return;
    setLoadingMoreArtists(true);
    try {
      const res = await getArtists(sort, 100, artistsCursor, debouncedSearch);
      setArtists((prev) => [...prev, ...res.artists]);
      setArtistsHasMore(res.hasMore);
      setArtistsCursor(res.nextCursor);
    } finally {
      setLoadingMoreArtists(false);
    }
  }, [
    artistsHasMore,
    loadingMoreArtists,
    isFilteringArtists,
    sort,
    artistsCursor,
    debouncedSearch,
  ]);

  const handleDeleteArtist = async () => {
    if (!selectedArtist || deletingArtist) return;
    if (typeof window !== "undefined") {
      if (
        !window.confirm(
          `정말로 "${selectedArtist.nameKo}" (ID ${selectedArtist.id}) 아티스트를 삭제할까요?`,
        )
      ) {
        return;
      }
    }

    setDeletingArtist(true);
    setMessage(null);
    try {
      await deleteArtist(selectedArtist.id);
      const res = await getArtists(sort, 100, undefined, debouncedSearch);
      setArtists(res.artists);
      setArtistsHasMore(res.hasMore);
      setArtistsCursor(res.nextCursor);
      setSelectedArtist(null);
      setSongs([]);
      setMessage({
        type: "success",
        text: "아티스트가 삭제되었습니다.",
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error?.message ?? "아티스트 삭제 중 오류가 발생했습니다.",
      });
    } finally {
      setDeletingArtist(false);
    }
  };

  const handleMergeArtist = async () => {
    if (!selectedArtist) return;
    const trimmed = mergeTargetArtistIdInput.trim();
    const targetId = Number.parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(targetId) || targetId <= 0) {
      setMergeError("대상 아티스트 ID를 올바르게 입력해주세요.");
      return;
    }

    setMergeSaving(true);
    setMergeError(null);
    try {
      const targetArtist = await getArtistById(targetId);
      if (!targetArtist) {
        setMergeError("대상 아티스트를 찾을 수 없습니다.");
        setMergeSaving(false);
        return;
      }

      if (typeof window !== "undefined") {
        if (
          !window.confirm(
            `정말 ${targetArtist.nameKo} (${targetId})에게 곡을 이전하고, ${selectedArtist.nameKo}(${selectedArtist.id})를 삭제하시겠습니까?`,
          )
        ) {
          setMergeSaving(false);
          return;
        }
      }

      await mergeArtist(selectedArtist.id, targetId);
      const res = await getArtists(sort, 100, undefined, debouncedSearch);
      setArtists(res.artists);
      setArtistsHasMore(res.hasMore);
      setArtistsCursor(res.nextCursor);
      setSelectedArtist(null);
      setSongs([]);
      setShowMergeDialog(false);
      setMergeTargetArtistIdInput("");
      setMessage({
        type: "success",
        text: "아티스트가 병합되었습니다.",
      });
    } catch (error: any) {
      setMergeError(error?.message ?? "아티스트 병합 중 오류가 발생했습니다.");
    } finally {
      setMergeSaving(false);
    }
  };

  useEffect(() => {
    if (!artistsHasMore || isFilteringArtists) return;
    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleLoadMoreArtists();
      }
    });

    observer.observe(target);
    return () => {
      observer.disconnect();
    };
  }, [artistsHasMore, isFilteringArtists, handleLoadMoreArtists]);

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

      {/* 2-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Artist List */}
        <div className="w-80 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col">
          {/* Artist List Header */}
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-4 py-2 flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
              Artists ({artists.length})
            </div>
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
              <label htmlFor="artists-sort" className="sr-only">
                정렬
              </label>
              <select
                id="artists-sort"
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOption)}
                className="rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Artist List */}
          <div className="flex-1 overflow-y-auto">
            {artistsLoading && (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                로딩 중...
              </div>
            )}

            {artists.map((artist) => (
              <button
                type="button"
                key={artist.id}
                id={`artist-${artist.id}`}
                onClick={() => setSelectedArtist(artist)}
                className={`w-full px-4 py-3 text-left border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                  selectedArtist?.id === artist.id
                    ? "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  {artist.thumbnailHigh ||
                  artist.thumbnailMedium ||
                  artist.thumbnailDefault ? (
                    <Image
                      src={
                        artist.thumbnailHigh ||
                        artist.thumbnailMedium ||
                        artist.thumbnailDefault ||
                        ""
                      }
                      alt={artist.nameKo}
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 dark:text-zinc-50 truncate">
                      {artist.nameKo}
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {artist.name}
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      분류: {artist.homeCatalog ?? "미지정"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      #{artist.id}
                    </div>
                    <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {artist.songCount}곡
                    </div>
                  </div>
                </div>
              </button>
            ))}

            <div ref={loadMoreRef} className="h-10 w-full">
              {loadingMoreArtists && (
                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                  더 불러오는 중...
                </p>
              )}
            </div>

            {artists.length === 0 && !artistsLoading && (
              <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                검색 결과가 없습니다
              </div>
            )}
          </div>
        </div>

        {/* Right: Song List */}
        <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex flex-col">
          {selectedArtist ? (
            <>
              {/* Artist Info Header */}
              <div className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-4">
                <div className="flex items-center gap-3">
                  {selectedArtist.thumbnailHigh ||
                  selectedArtist.thumbnailMedium ||
                  selectedArtist.thumbnailDefault ? (
                    <Image
                      src={
                        selectedArtist.thumbnailHigh ||
                        selectedArtist.thumbnailMedium ||
                        selectedArtist.thumbnailDefault ||
                        ""
                      }
                      alt={selectedArtist.nameKo}
                      width={48}
                      height={48}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-zinc-200 dark:bg-zinc-700" />
                  )}
                  <div className="flex-1">
                    <div className="relative inline-block" ref={nameKoMenuRef}>
                      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                        <button
                          type="button"
                          onClick={() => setNameKoMenuOpen((prev) => !prev)}
                          className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          style={{ cursor: "pointer" }}
                        >
                          {selectedArtist.nameKo}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-5 w-5"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Artist ID: {selectedArtist.id}
                      </p>
                      {nameKoMenuOpen && (
                        <div className="absolute left-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                          <button
                            type="button"
                            onClick={() => {
                              setNameKoMenuOpen(false);
                              setShowNameKoDialog(true);
                              setNameKoError(null);
                              setNameKoInput(selectedArtist.nameKo);
                            }}
                            className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            style={{ cursor: "pointer" }}
                          >
                            편집
                          </button>
                          <a
                            href={`https://www.google.com/search?q=${encodeURIComponent(selectedArtist.nameKo)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setNameKoMenuOpen(false)}
                            className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            style={{ cursor: "pointer" }}
                          >
                            구글 검색
                          </a>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      <span className="relative inline-block" ref={nameMenuRef}>
                        <button
                          type="button"
                          onClick={() => setNameMenuOpen((prev) => !prev)}
                          className="inline-flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          style={{ cursor: "pointer" }}
                        >
                          {selectedArtist.name}
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                        {nameMenuOpen && (
                          <div className="absolute left-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                            <button
                              type="button"
                              onClick={() => {
                                setNameMenuOpen(false);
                                setShowNameDialog(true);
                                setNameError(null);
                                setNameInput(selectedArtist.name);
                              }}
                              className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              style={{ cursor: "pointer" }}
                            >
                              편집
                            </button>
                            <a
                              href={`https://www.google.com/search?q=${encodeURIComponent(selectedArtist.name)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => setNameMenuOpen(false)}
                              className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              style={{ cursor: "pointer" }}
                            >
                              구글 검색
                            </a>
                          </div>
                        )}
                      </span>
                      {selectedArtist.alias && (
                        <>
                          {" • "}
                          <span
                            className="relative inline-block"
                            ref={aliasMenuRef}
                          >
                            <button
                              type="button"
                              onClick={() => setAliasMenuOpen((prev) => !prev)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                              style={{ cursor: "pointer" }}
                            >
                              @{selectedArtist.alias}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-4 w-4"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                            {aliasMenuOpen && (
                              <div className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                                <a
                                  href={`/channel/${selectedArtist.alias}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={() => setAliasMenuOpen(false)}
                                  className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                  style={{ cursor: "pointer" }}
                                >
                                  아티스트 페이지로 이동
                                </a>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAliasMenuOpen(false);
                                    setShowAliasDialog(true);
                                    setAliasError(null);
                                    setAliasInput(selectedArtist.alias ?? "");
                                  }}
                                  className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                  style={{ cursor: "pointer" }}
                                >
                                  별칭 수정
                                </button>
                              </div>
                            )}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      분류: {selectedArtist.homeCatalog ?? "미지정"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative" ref={catalogMenuRef}>
                      <button
                        type="button"
                        onClick={() => setCatalogMenuOpen((prev) => !prev)}
                        className="inline-flex items-center gap-1 rounded border border-purple-300 px-3 py-1 text-xs font-semibold text-purple-600 hover:bg-purple-50 dark:border-purple-500/40 dark:text-purple-200 dark:hover:bg-purple-900/30 disabled:cursor-not-allowed disabled:opacity-60"
                        style={{ cursor: "pointer" }}
                        disabled={catalogSaving}
                      >
                        {catalogSaving ? "설정 중..." : "가수분류설정"}
                        {selectedArtist.homeCatalog ? (
                          <span className="ml-1 text-[11px] font-normal text-purple-500 dark:text-purple-200">
                            ({selectedArtist.homeCatalog})
                          </span>
                        ) : null}
                      </button>
                      {catalogMenuOpen && (
                        <div className="absolute right-0 mt-2 w-32 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20">
                          {ARTIST_CATALOG_OPTIONS.map((option) => {
                            const isActive = option.value
                              ? selectedArtist.homeCatalog === option.value
                              : !selectedArtist.homeCatalog;
                            return (
                              <button
                                key={option.label}
                                type="button"
                                onClick={() =>
                                  handleArtistCatalogChange(option.value)
                                }
                                disabled={catalogSaving}
                                className={`block w-full px-3 py-2 text-left text-sm ${
                                  isActive
                                    ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-200"
                                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                }`}
                                style={{ cursor: "pointer" }}
                              >
                                {option.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMergeDialog(true);
                        setMergeTargetArtistIdInput("");
                        setMergeError(null);
                      }}
                      className="inline-flex items-center gap-1 rounded border border-blue-300 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-500/40 dark:text-blue-300 dark:hover:bg-blue-900/20"
                      style={{ cursor: "pointer" }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      아티스트 병합하기
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteArtist}
                      className="inline-flex items-center gap-1 rounded border border-red-300 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-300 dark:hover:bg-red-900/20"
                      style={{ cursor: "pointer" }}
                      disabled={deletingArtist}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M3 6h18" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      {deletingArtist ? "삭제 중..." : "아티스트 삭제"}
                    </button>
                    <div className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      {selectedArtist.songCount}곡
                    </div>
                  </div>
                </div>
              </div>

              {/* Song List */}
              <div className="flex-1 overflow-y-auto p-6">
                {songsLoading && (
                  <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    로딩 중...
                  </div>
                )}

                {songs && songs.length === 0 && (
                  <div className="text-center text-sm text-zinc-500 dark:text-zinc-400">
                    곡이 없습니다
                  </div>
                )}

                <div className="space-y-2">
                  {songs.map((song) => (
                    <div
                      key={song.id}
                      className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {song.title}
                          </div>
                          {song.titleKo && song.titleKo !== song.title && (
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                              {song.titleKo}
                            </div>
                          )}
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                            곡 ID: {song.id}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            소유 아티스트:&nbsp;
                            {song.owners && song.owners.length > 0 ? (
                              song.owners
                                .map(
                                  (owner) =>
                                    `${owner.nameKo || owner.name} (ID ${
                                      owner.id
                                    })`,
                                )
                                .join(", ")
                            ) : (
                              <span className="text-zinc-400">
                                연결된 아티스트 없음
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                            분류: {song.catalog ?? "미지정"}
                          </div>

                          {song.karaokeSongs &&
                            song.karaokeSongs.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {song.karaokeSongs.map((kn) => (
                                  <span
                                    key={`${kn.provider}-${kn.karaokeNo}`}
                                    className="text-xs px-2 py-1 rounded bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                  >
                                    {kn.provider} {kn.karaokeNo}
                                  </span>
                                ))}
                              </div>
                            )}
                        </div>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setSongMenuOpen(
                                songMenuOpen === song.id ? null : song.id,
                              )
                            }
                            className="p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            style={{ cursor: "pointer" }}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-5 w-5 text-zinc-500 dark:text-zinc-400"
                              aria-hidden="true"
                            >
                              <path d="M10 3a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM10 8.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3zM11.5 15.5a1.5 1.5 0 10-3 0 1.5 1.5 0 003 0z" />
                            </svg>
                          </button>
                          {songMenuOpen === song.id && (
                            <div
                              ref={(el) => {
                                if (el) {
                                  songMenuRefs.current.set(song.id, el);
                                } else {
                                  songMenuRefs.current.delete(song.id);
                                }
                              }}
                              className="absolute right-0 mt-2 w-48 rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900 z-20"
                            >
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSong(song);
                                  setSongTitleInput(song.title);
                                  setSongTitleKoInput(song.titleKo ?? "");
                                  setSongTitleError(null);
                                  setShowSongTitleDialog(true);
                                  setSongMenuOpen(null);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                style={{ cursor: "pointer" }}
                              >
                                제목 편집
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSong(song);
                                  const tj = song.karaokeSongs.find(
                                    (k) => k.provider === "TJ",
                                  );
                                  const ky = song.karaokeSongs.find(
                                    (k) => k.provider === "KY",
                                  );
                                  const joysound = song.karaokeSongs.find(
                                    (k) => k.provider === "JOYSOUND",
                                  );
                                  setKaraokeTjInput(tj?.karaokeNo ?? "");
                                  setKaraokeKyInput(ky?.karaokeNo ?? "");
                                  setKaraokeJoysoundInput(
                                    joysound?.karaokeNo ?? "",
                                  );
                                  setKaraokeError(null);
                                  setShowKaraokeDialog(true);
                                  setSongMenuOpen(null);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                style={{ cursor: "pointer" }}
                              >
                                노래방번호 편집
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddOwnershipSong(song);
                                  setAddOwnershipArtistIdInput("");
                                  setAddOwnershipError(null);
                                  setShowAddOwnershipDialog(true);
                                  setSongMenuOpen(null);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                style={{ cursor: "pointer" }}
                              >
                                곡 소유권 추가하기
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTransferSong(song);
                                  setTransferArtistIdInput("");
                                  setTransferError(null);
                                  setShowTransferDialog(true);
                                  setSongMenuOpen(null);
                                }}
                                className="block w-full px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                style={{ cursor: "pointer" }}
                              >
                                곡 소유권 이전하기
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-zinc-500 dark:text-zinc-400">
                <svg
                  className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  role="img"
                  aria-label="No artist selected"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                  />
                </svg>
                <p className="text-sm">왼쪽에서 아티스트를 선택하세요</p>
              </div>
            </div>
          )}
        </div>

        {showTransferDialog && transferSong && selectedArtist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                곡 소유권 이전
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                선택한 곡을 다른 아티스트 ID로 매핑합니다.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {transferSong.title}
                  </p>
                  {transferSong.titleKo && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {transferSong.titleKo}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    현재 아티스트: {selectedArtist.name} (ID {selectedArtist.id}
                    )
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    이전할 아티스트 ID
                  </label>
                  <input
                    type="number"
                    value={transferArtistIdInput}
                    onChange={(e) => setTransferArtistIdInput(e.target.value)}
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    placeholder="예: 1234"
                    style={{ cursor: "text" }}
                  />
                  {transferError && (
                    <p className="mt-2 text-xs text-red-500">{transferError}</p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferDialog(false);
                    setTransferSong(null);
                    setTransferArtistIdInput("");
                    setTransferError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleTransferOwnership}
                  disabled={transferSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:disabled:bg-indigo-900/40"
                  style={{ cursor: "pointer" }}
                >
                  {transferSaving ? "이전 중..." : "이전하기"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddOwnershipDialog && addOwnershipSong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                곡 소유권 추가
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                다른 아티스트를 이 곡에 추가로 매핑합니다.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {addOwnershipSong.title}
                  </p>
                  {addOwnershipSong.titleKo && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {addOwnershipSong.titleKo}
                    </p>
                  )}
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    곡 ID: {addOwnershipSong.id}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    추가할 아티스트 ID
                  </label>
                  <input
                    type="number"
                    value={addOwnershipArtistIdInput}
                    onChange={(e) =>
                      setAddOwnershipArtistIdInput(e.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    placeholder="예: 1234"
                    style={{ cursor: "text" }}
                  />
                  {addOwnershipError && (
                    <p className="mt-2 text-xs text-red-500">
                      {addOwnershipError}
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddOwnershipDialog(false);
                    setAddOwnershipSong(null);
                    setAddOwnershipArtistIdInput("");
                    setAddOwnershipError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAddOwnership}
                  disabled={addOwnershipSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-blue-900/40"
                  style={{ cursor: "pointer" }}
                >
                  {addOwnershipSaving ? "추가 중..." : "추가하기"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showNameKoDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                한국어 이름 수정
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                새로운 한국어 이름을 입력하세요.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="nameko-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  한국어 이름
                </label>
                <input
                  id="nameko-input"
                  type="text"
                  value={nameKoInput}
                  onChange={(e) => {
                    setNameKoInput(e.target.value);
                    if (nameKoError) setNameKoError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleNameKoSave();
                    }
                  }}
                  placeholder="상대성이론"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
                {nameKoError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {nameKoError}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNameKoDialog(false);
                    setNameKoError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleNameKoSave}
                  disabled={nameKoSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                  style={{ cursor: "pointer" }}
                >
                  {nameKoSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showNameDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                이름 수정
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                새로운 이름을 입력하세요.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="name-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  이름
                </label>
                <input
                  id="name-input"
                  type="text"
                  value={nameInput}
                  onChange={(e) => {
                    setNameInput(e.target.value);
                    if (nameError) setNameError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleNameSave();
                    }
                  }}
                  placeholder="相対性理論"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
                {nameError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {nameError}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowNameDialog(false);
                    setNameError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleNameSave}
                  disabled={nameSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                  style={{ cursor: "pointer" }}
                >
                  {nameSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showAliasDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                별칭 수정
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                새로운 별칭을 입력하면 바로 적용됩니다.
              </p>
              <div className="mt-4">
                <label
                  htmlFor="alias-input"
                  className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                >
                  새 별칭
                </label>
                <input
                  id="alias-input"
                  type="text"
                  value={aliasInput}
                  onChange={(e) => {
                    setAliasInput(e.target.value);
                    if (aliasError) setAliasError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAliasSave();
                    }
                  }}
                  placeholder="yuika"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                  style={{ cursor: "text" }}
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  '@' 없이 입력하세요. 예) yuika
                </p>
                {aliasError && (
                  <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                    {aliasError}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAliasDialog(false);
                    setAliasError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleAliasSave}
                  disabled={aliasSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                  style={{ cursor: "pointer" }}
                >
                  {aliasSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showSongTitleDialog && editingSong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                제목 편집
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                곡 제목을 수정하세요.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="song-title-input"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    제목
                  </label>
                  <input
                    id="song-title-input"
                    type="text"
                    value={songTitleInput}
                    onChange={(e) => {
                      setSongTitleInput(e.target.value);
                      if (songTitleError) setSongTitleError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSongTitleSave();
                      }
                    }}
                    placeholder="夜に駆ける"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    style={{ cursor: "text" }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="song-titleko-input"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    한글 제목 (선택)
                  </label>
                  <input
                    id="song-titleko-input"
                    type="text"
                    value={songTitleKoInput}
                    onChange={(e) => {
                      setSongTitleKoInput(e.target.value);
                      if (songTitleError) setSongTitleError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSongTitleSave();
                      }
                    }}
                    placeholder="밤을 달리다"
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    style={{ cursor: "text" }}
                  />
                </div>
                {songTitleError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {songTitleError}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSongTitleDialog(false);
                    setSongTitleError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleSongTitleSave}
                  disabled={songTitleSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                  style={{ cursor: "pointer" }}
                >
                  {songTitleSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showMergeDialog && selectedArtist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                아티스트 병합
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                현재 아티스트의 모든 곡을 대상 아티스트로 이전하고, 현재
                아티스트를 삭제합니다.
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-800">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                    {selectedArtist.nameKo}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    현재 아티스트 ID: {selectedArtist.id} (삭제될 아티스트)
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    곡 수: {selectedArtist.songCount}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    대상 아티스트 ID (곡을 받을 아티스트)
                  </label>
                  <input
                    type="number"
                    value={mergeTargetArtistIdInput}
                    onChange={(e) =>
                      setMergeTargetArtistIdInput(e.target.value)
                    }
                    className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    placeholder="예: 24"
                    style={{ cursor: "text" }}
                  />
                  {mergeError && (
                    <p className="mt-2 text-xs text-red-500">{mergeError}</p>
                  )}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowMergeDialog(false);
                    setMergeTargetArtistIdInput("");
                    setMergeError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleMergeArtist}
                  disabled={mergeSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 dark:bg-blue-500 dark:hover:bg-blue-400 dark:disabled:bg-blue-900/40"
                  style={{ cursor: "pointer" }}
                >
                  {mergeSaving ? "병합 중..." : "확인"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showKaraokeDialog && editingSong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900 dark:text-zinc-50">
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                노래방번호 편집
              </h3>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                노래방 번호를 수정하세요. 빈 값으로 두면 삭제됩니다.
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="karaoke-tj-input"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    TJ
                  </label>
                  <input
                    id="karaoke-tj-input"
                    type="text"
                    value={karaokeTjInput}
                    onChange={(e) => {
                      setKaraokeTjInput(e.target.value);
                      if (karaokeError) setKaraokeError(null);
                    }}
                    placeholder=""
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    style={{ cursor: "text" }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="karaoke-ky-input"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    KY
                  </label>
                  <input
                    id="karaoke-ky-input"
                    type="text"
                    value={karaokeKyInput}
                    onChange={(e) => {
                      setKaraokeKyInput(e.target.value);
                      if (karaokeError) setKaraokeError(null);
                    }}
                    placeholder=""
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    style={{ cursor: "text" }}
                  />
                </div>
                <div>
                  <label
                    htmlFor="karaoke-joysound-input"
                    className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
                  >
                    JOYSOUND
                  </label>
                  <input
                    id="karaoke-joysound-input"
                    type="text"
                    value={karaokeJoysoundInput}
                    onChange={(e) => {
                      setKaraokeJoysoundInput(e.target.value);
                      if (karaokeError) setKaraokeError(null);
                    }}
                    placeholder=""
                    className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                    style={{ cursor: "text" }}
                  />
                </div>
                {karaokeError && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {karaokeError}
                  </p>
                )}
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowKaraokeDialog(false);
                    setKaraokeError(null);
                  }}
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  style={{ cursor: "pointer" }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={handleKaraokeSave}
                  disabled={karaokeSaving}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:disabled:bg-zinc-700"
                  style={{ cursor: "pointer" }}
                >
                  {karaokeSaving ? "저장 중..." : "저장"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
