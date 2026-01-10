import { create } from "zustand";
import {
  addSongOwnership,
  createKaraokeSong,
  deleteArtist,
  deleteKaraokeSong,
  getArtistById,
  getArtists,
  getSongsByArtist,
  getSpotifyTracksByArtist,
  mergeArtist,
  transferSongOwnership,
  updateArtistCatalog,
  updateArtistName,
  updateArtistNameKo,
  updateArtistSlug,
  updateKaraokeSong,
  updateSongTitle,
} from "./actions";

type ArtistsResponse = Awaited<ReturnType<typeof getArtists>>;
type Artist = ArtistsResponse["artists"][number];
type Song = Awaited<ReturnType<typeof getSongsByArtist>>[number];
type SpotifyTrack = Awaited<
  ReturnType<typeof getSpotifyTracksByArtist>
>[number];

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

const ARTIST_CATALOG_OPTIONS = [
  { label: "삭제", value: null as const },
  { label: "KPOP", value: "KPOP" as const },
  { label: "JPOP", value: "JPOP" as const },
  { label: "POP", value: "POP" as const },
  { label: "CPOP", value: "CPOP" as const },
] as const;
type ArtistCatalogOption = (typeof ARTIST_CATALOG_OPTIONS)[number]["value"];

interface ArtistsState {
  // Artists List
  sort: SortOption;
  artists: Artist[];
  artistsLoading: boolean;
  artistsHasMore: boolean;
  artistsCursor?: number;
  loadingMoreArtists: boolean;
  searchQuery: string;
  debouncedSearch: string;
  pendingArtistId: number | null;
  pendingArtistLoading: boolean;

  // Selected Artist
  selectedArtist: Artist | null;
  songs: Song[];
  songsLoading: boolean;
  spotifyTracks: SpotifyTrack[];
  spotifyTracksLoading: boolean;

  // UI States - Menus
  nameKoMenuOpen: boolean;
  nameMenuOpen: boolean;
  slugMenuOpen: boolean;
  catalogMenuOpen: boolean;
  songMenuOpen: number | null;

  // UI States - Dialogs
  showNameKoDialog: boolean;
  nameKoInput: string;
  nameKoSaving: boolean;
  nameKoError: string | null;

  showNameDialog: boolean;
  nameInput: string;
  nameSaving: boolean;
  nameError: string | null;

  showSlugDialog: boolean;
  slugInput: string;
  slugSaving: boolean;
  slugError: string | null;

  showSongTitleDialog: boolean;
  editingSong: Song | null;
  songTitleInput: string;
  songTitleKoInput: string;
  songTitleSaving: boolean;
  songTitleError: string | null;

  showKaraokeDialog: boolean;
  karaokeTjInput: string;
  karaokeKyInput: string;
  karaokeJoysoundInput: string;
  karaokeSaving: boolean;
  karaokeError: string | null;

  showTransferDialog: boolean;
  transferSong: Song | null;
  transferArtistIdInput: string;
  transferSaving: boolean;
  transferError: string | null;

  showAddOwnershipDialog: boolean;
  addOwnershipSong: Song | null;
  addOwnershipArtistIdInput: string;
  addOwnershipSaving: boolean;
  addOwnershipError: string | null;

  showMergeDialog: boolean;
  mergeTargetArtistIdInput: string;
  mergeSaving: boolean;
  mergeError: string | null;

  message: { type: "success" | "error"; text: string } | null;
  deletingArtist: boolean;
  catalogSaving: boolean;

  // Actions
  setSort: (sort: SortOption) => void;
  setSearchQuery: (query: string) => void;
  setDebouncedSearch: (query: string) => void;
  setSelectedArtist: (artist: Artist | null) => void;
  setPendingArtistId: (id: number | null) => void;
  setSongMenuOpen: (id: number | null) => void;

  // Menu toggles
  setNameKoMenuOpen: (open: boolean) => void;
  setNameMenuOpen: (open: boolean) => void;
  setSlugMenuOpen: (open: boolean) => void;
  setCatalogMenuOpen: (open: boolean) => void;

  // Dialog actions
  openNameKoDialog: () => void;
  closeNameKoDialog: () => void;
  setNameKoInput: (value: string) => void;
  setNameKoError: (error: string | null) => void;

  openNameDialog: () => void;
  closeNameDialog: () => void;
  setNameInput: (value: string) => void;
  setNameError: (error: string | null) => void;

  openSlugDialog: () => void;
  closeSlugDialog: () => void;
  setSlugInput: (value: string) => void;
  setSlugError: (error: string | null) => void;

  openSongTitleDialog: (song: Song) => void;
  closeSongTitleDialog: () => void;
  setSongTitleInput: (value: string) => void;
  setSongTitleKoInput: (value: string) => void;
  setSongTitleError: (error: string | null) => void;

  openKaraokeDialog: (song: Song) => void;
  closeKaraokeDialog: () => void;
  setKaraokeTjInput: (value: string) => void;
  setKaraokeKyInput: (value: string) => void;
  setKaraokeJoysoundInput: (value: string) => void;
  setKaraokeError: (error: string | null) => void;

  openTransferDialog: (song: Song) => void;
  closeTransferDialog: () => void;
  setTransferArtistIdInput: (value: string) => void;
  setTransferError: (error: string | null) => void;

  openAddOwnershipDialog: (song: Song) => void;
  closeAddOwnershipDialog: () => void;
  setAddOwnershipArtistIdInput: (value: string) => void;
  setAddOwnershipError: (error: string | null) => void;

  openMergeDialog: () => void;
  closeMergeDialog: () => void;
  setMergeTargetArtistIdInput: (value: string) => void;
  setMergeError: (error: string | null) => void;

  setMessage: (
    message: { type: "success" | "error"; text: string } | null,
  ) => void;

  // Async actions
  loadArtists: () => Promise<void>;
  loadMoreArtists: () => Promise<void>;
  loadArtistById: (id: number) => Promise<void>;
  loadSongs: (artistId: number) => Promise<void>;
  loadSpotifyTracks: (artistId: number) => Promise<void>;

  saveNameKo: () => Promise<void>;
  saveName: () => Promise<void>;
  saveSlug: () => Promise<void>;
  saveSongTitle: () => Promise<void>;
  saveKaraoke: () => Promise<void>;
  saveTransferOwnership: () => Promise<void>;
  saveAddOwnership: () => Promise<void>;
  handleDeleteArtist: () => Promise<void>;
  handleMergeArtist: () => Promise<void>;
  handleArtistCatalogChange: (value: ArtistCatalogOption) => Promise<void>;

  // Utility
  resetDialogStates: () => void;
}

export const useArtistsStore = create<ArtistsState>((set, get) => ({
  // Initial States
  sort: DEFAULT_SORT,
  artists: [],
  artistsLoading: true,
  artistsHasMore: false,
  artistsCursor: undefined,
  loadingMoreArtists: false,
  searchQuery: "",
  debouncedSearch: "",
  pendingArtistId: null,
  pendingArtistLoading: false,

  selectedArtist: null,
  songs: [],
  songsLoading: false,
  spotifyTracks: [],
  spotifyTracksLoading: false,

  nameKoMenuOpen: false,
  nameMenuOpen: false,
  slugMenuOpen: false,
  catalogMenuOpen: false,
  songMenuOpen: null,

  showNameKoDialog: false,
  nameKoInput: "",
  nameKoSaving: false,
  nameKoError: null,

  showNameDialog: false,
  nameInput: "",
  nameSaving: false,
  nameError: null,

  showSlugDialog: false,
  slugInput: "",
  slugSaving: false,
  slugError: null,

  showSongTitleDialog: false,
  editingSong: null,
  songTitleInput: "",
  songTitleKoInput: "",
  songTitleSaving: false,
  songTitleError: null,

  showKaraokeDialog: false,
  karaokeTjInput: "",
  karaokeKyInput: "",
  karaokeJoysoundInput: "",
  karaokeSaving: false,
  karaokeError: null,

  showTransferDialog: false,
  transferSong: null,
  transferArtistIdInput: "",
  transferSaving: false,
  transferError: null,

  showAddOwnershipDialog: false,
  addOwnershipSong: null,
  addOwnershipArtistIdInput: "",
  addOwnershipSaving: false,
  addOwnershipError: null,

  showMergeDialog: false,
  mergeTargetArtistIdInput: "",
  mergeSaving: false,
  mergeError: null,

  message: null,
  deletingArtist: false,
  catalogSaving: false,

  // Simple setters
  setSort: (sort) => set({ sort }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDebouncedSearch: (query) => set({ debouncedSearch: query }),
  setSelectedArtist: (artist) => set({ selectedArtist: artist }),
  setPendingArtistId: (id) => set({ pendingArtistId: id }),
  setSongMenuOpen: (id) => set({ songMenuOpen: id }),

  setNameKoMenuOpen: (open) => set({ nameKoMenuOpen: open }),
  setNameMenuOpen: (open) => set({ nameMenuOpen: open }),
  setSlugMenuOpen: (open) => set({ slugMenuOpen: open }),
  setCatalogMenuOpen: (open) => set({ catalogMenuOpen: open }),

  openNameKoDialog: () => {
    const { selectedArtist } = get();
    set({
      showNameKoDialog: true,
      nameKoInput: selectedArtist?.nameKo ?? "",
      nameKoError: null,
    });
  },
  closeNameKoDialog: () => set({ showNameKoDialog: false, nameKoError: null }),
  setNameKoInput: (value) => set({ nameKoInput: value }),
  setNameKoError: (error) => set({ nameKoError: error }),

  openNameDialog: () => {
    const { selectedArtist } = get();
    set({
      showNameDialog: true,
      nameInput: selectedArtist?.name ?? "",
      nameError: null,
    });
  },
  closeNameDialog: () => set({ showNameDialog: false, nameError: null }),
  setNameInput: (value) => set({ nameInput: value }),
  setNameError: (error) => set({ nameError: error }),

  openSlugDialog: () => {
    const { selectedArtist } = get();
    set({
      showSlugDialog: true,
      slugInput: selectedArtist?.slug ?? "",
      slugError: null,
    });
  },
  closeSlugDialog: () => set({ showSlugDialog: false, slugError: null }),
  setSlugInput: (value) => set({ slugInput: value }),
  setSlugError: (error) => set({ slugError: error }),

  openSongTitleDialog: (song) =>
    set({
      showSongTitleDialog: true,
      editingSong: song,
      songTitleInput: song.title,
      songTitleKoInput: song.titleKo ?? "",
      songTitleError: null,
    }),
  closeSongTitleDialog: () =>
    set({
      showSongTitleDialog: false,
      editingSong: null,
      songTitleError: null,
    }),
  setSongTitleInput: (value) => set({ songTitleInput: value }),
  setSongTitleKoInput: (value) => set({ songTitleKoInput: value }),
  setSongTitleError: (error) => set({ songTitleError: error }),

  openKaraokeDialog: (song) => {
    const tjSong = song.karaokeSongs.find((k) => k.provider === "TJ");
    const kySong = song.karaokeSongs.find((k) => k.provider === "KY");
    const joysoundSong = song.karaokeSongs.find(
      (k) => k.provider === "JOYSOUND",
    );

    set({
      showKaraokeDialog: true,
      editingSong: song,
      karaokeTjInput: tjSong?.code ?? "",
      karaokeKyInput: kySong?.code ?? "",
      karaokeJoysoundInput: joysoundSong?.code ?? "",
      karaokeError: null,
    });
  },
  closeKaraokeDialog: () =>
    set({
      showKaraokeDialog: false,
      editingSong: null,
      karaokeError: null,
    }),
  setKaraokeTjInput: (value) => set({ karaokeTjInput: value }),
  setKaraokeKyInput: (value) => set({ karaokeKyInput: value }),
  setKaraokeJoysoundInput: (value) => set({ karaokeJoysoundInput: value }),
  setKaraokeError: (error) => set({ karaokeError: error }),

  openTransferDialog: (song) =>
    set({
      showTransferDialog: true,
      transferSong: song,
      transferArtistIdInput: "",
      transferError: null,
    }),
  closeTransferDialog: () =>
    set({
      showTransferDialog: false,
      transferSong: null,
      transferArtistIdInput: "",
      transferError: null,
    }),
  setTransferArtistIdInput: (value) => set({ transferArtistIdInput: value }),
  setTransferError: (error) => set({ transferError: error }),

  openAddOwnershipDialog: (song) =>
    set({
      showAddOwnershipDialog: true,
      addOwnershipSong: song,
      addOwnershipArtistIdInput: "",
      addOwnershipError: null,
    }),
  closeAddOwnershipDialog: () =>
    set({
      showAddOwnershipDialog: false,
      addOwnershipSong: null,
      addOwnershipArtistIdInput: "",
      addOwnershipError: null,
    }),
  setAddOwnershipArtistIdInput: (value) =>
    set({ addOwnershipArtistIdInput: value }),
  setAddOwnershipError: (error) => set({ addOwnershipError: error }),

  openMergeDialog: () =>
    set({
      showMergeDialog: true,
      mergeTargetArtistIdInput: "",
      mergeError: null,
    }),
  closeMergeDialog: () =>
    set({
      showMergeDialog: false,
      mergeTargetArtistIdInput: "",
      mergeError: null,
    }),
  setMergeTargetArtistIdInput: (value) =>
    set({ mergeTargetArtistIdInput: value }),
  setMergeError: (error) => set({ mergeError: error }),

  setMessage: (message) => set({ message }),

  // Async actions
  loadArtists: async () => {
    const { sort, debouncedSearch } = get();
    set({ artistsLoading: true });
    try {
      const res = await getArtists(sort, 100, undefined, debouncedSearch);
      set({
        artists: res.artists,
        artistsHasMore: res.hasMore,
        artistsCursor: res.nextCursor,
      });
    } finally {
      set({ artistsLoading: false });
    }
  },

  loadMoreArtists: async () => {
    const {
      artistsHasMore,
      loadingMoreArtists,
      debouncedSearch,
      sort,
      artistsCursor,
    } = get();
    const isFilteringArtists = debouncedSearch.trim().length > 0;

    if (!artistsHasMore || loadingMoreArtists || isFilteringArtists) return;

    set({ loadingMoreArtists: true });
    try {
      const res = await getArtists(sort, 100, artistsCursor, debouncedSearch);
      set((state) => ({
        artists: [...state.artists, ...res.artists],
        artistsHasMore: res.hasMore,
        artistsCursor: res.nextCursor,
      }));
    } finally {
      set({ loadingMoreArtists: false });
    }
  },

  loadArtistById: async (id: number) => {
    const { artists, pendingArtistLoading } = get();

    const existing = artists.find((a) => a.id === id);
    if (existing) {
      set({
        selectedArtist: existing,
        pendingArtistId: null,
      });
      return;
    }

    if (pendingArtistLoading) return;

    set({ pendingArtistLoading: true });
    try {
      const artist = await getArtistById(id);
      if (!artist) {
        set({ pendingArtistId: null });
        return;
      }

      set((state) => {
        const exists = state.artists.some((a) => a.id === artist.id);
        return {
          artists: exists ? state.artists : [artist, ...state.artists],
          selectedArtist: artist,
          pendingArtistId: null,
        };
      });
    } finally {
      set({ pendingArtistLoading: false });
    }
  },

  loadSongs: async (artistId: number) => {
    set({ songsLoading: true });
    try {
      const songs = await getSongsByArtist(artistId);
      set({ songs });
    } finally {
      set({ songsLoading: false });
    }
  },

  loadSpotifyTracks: async (artistId: number) => {
    set({ spotifyTracksLoading: true });
    try {
      const tracks = await getSpotifyTracksByArtist(artistId);
      set({ spotifyTracks: tracks });
    } finally {
      set({ spotifyTracksLoading: false });
    }
  },

  saveNameKo: async () => {
    const { selectedArtist, nameKoInput, sort, debouncedSearch } = get();
    if (!selectedArtist) return;

    const trimmedNameKo = nameKoInput.trim();
    if (!trimmedNameKo) {
      set({ nameKoError: "한국어 이름을 입력해주세요." });
      return;
    }

    set({ nameKoSaving: true, nameKoError: null });

    try {
      const response = await updateArtistNameKo(
        selectedArtist.id,
        trimmedNameKo,
      );

      set({
        message: {
          type: "success",
          text: `✅ 한국어 이름이 "${response.nameKo}"로 저장되었습니다.`,
        },
      });

      const updatedArtists = await getArtists(
        sort,
        100,
        undefined,
        debouncedSearch,
      );
      const updatedArtist = updatedArtists.artists.find(
        (a) => a.id === selectedArtist.id,
      );

      set({
        artists: updatedArtists.artists,
        artistsHasMore: updatedArtists.hasMore,
        artistsCursor: updatedArtists.nextCursor,
        selectedArtist: updatedArtist ?? selectedArtist,
        showNameKoDialog: false,
        nameKoMenuOpen: false,
      });
    } catch (error: any) {
      set({
        nameKoError:
          error.message ?? "한국어 이름 저장 중 오류가 발생했습니다.",
      });
    } finally {
      set({ nameKoSaving: false });
    }
  },

  saveName: async () => {
    const { selectedArtist, nameInput, sort, debouncedSearch } = get();
    if (!selectedArtist) return;

    const trimmedName = nameInput.trim();
    if (!trimmedName) {
      set({ nameError: "이름을 입력해주세요." });
      return;
    }

    set({ nameSaving: true, nameError: null });

    try {
      const response = await updateArtistName(selectedArtist.id, trimmedName);

      set({
        message: {
          type: "success",
          text: `✅ 이름이 "${response.name}"로 저장되었습니다.`,
        },
      });

      const updatedArtists = await getArtists(
        sort,
        100,
        undefined,
        debouncedSearch,
      );
      const updatedArtist = updatedArtists.artists.find(
        (a) => a.id === selectedArtist.id,
      );

      set({
        artists: updatedArtists.artists,
        artistsHasMore: updatedArtists.hasMore,
        artistsCursor: updatedArtists.nextCursor,
        selectedArtist: updatedArtist ?? selectedArtist,
        showNameDialog: false,
        nameMenuOpen: false,
      });
    } catch (error: any) {
      set({
        nameError: error.message ?? "이름 저장 중 오류가 발생했습니다.",
      });
    } finally {
      set({ nameSaving: false });
    }
  },

  saveSlug: async () => {
    const { selectedArtist, slugInput, sort, debouncedSearch } = get();
    if (!selectedArtist) return;

    const sanitizedSlug = slugInput.trim().replace(/^@/, "");
    if (!sanitizedSlug) {
      set({ slugError: "별칭을 입력해주세요." });
      return;
    }

    set({ slugSaving: true, slugError: null });

    try {
      const response = await updateArtistSlug(selectedArtist.id, sanitizedSlug);

      set({
        message: {
          type: "success",
          text: `✅ ${selectedArtist.nameKo}: @${
            response.slug ?? sanitizedSlug
          }로 저장되었습니다.`,
        },
      });

      const updatedArtists = await getArtists(
        sort,
        100,
        undefined,
        debouncedSearch,
      );
      const updatedArtist = updatedArtists.artists.find(
        (a) => a.id === selectedArtist.id,
      );

      set({
        artists: updatedArtists.artists,
        artistsHasMore: updatedArtists.hasMore,
        artistsCursor: updatedArtists.nextCursor,
        selectedArtist: updatedArtist ?? selectedArtist,
        showSlugDialog: false,
        slugMenuOpen: false,
      });
    } catch (error: any) {
      set({
        slugError: error.message ?? "별칭 저장 중 오류가 발생했습니다.",
      });
    } finally {
      set({ slugSaving: false });
    }
  },

  saveSongTitle: async () => {
    const { editingSong, songTitleInput, songTitleKoInput, selectedArtist } =
      get();
    if (!editingSong) return;

    const trimmedTitle = songTitleInput.trim();
    if (!trimmedTitle) {
      set({ songTitleError: "제목을 입력해주세요." });
      return;
    }

    set({ songTitleSaving: true, songTitleError: null });

    try {
      await updateSongTitle(
        editingSong.id,
        trimmedTitle,
        songTitleKoInput.trim() || undefined,
      );

      set({
        message: {
          type: "success",
          text: `✅ 제목이 "${trimmedTitle}"로 저장되었습니다.`,
        },
      });

      if (selectedArtist) {
        const updatedSongs = await getSongsByArtist(selectedArtist.id);
        set({ songs: updatedSongs });
      }

      set({
        showSongTitleDialog: false,
        songMenuOpen: null,
      });
    } catch (error: any) {
      set({
        songTitleError: error.message ?? "제목 저장 중 오류가 발생했습니다.",
      });
    } finally {
      set({ songTitleSaving: false });
    }
  },

  saveKaraoke: async () => {
    const {
      editingSong,
      karaokeTjInput,
      karaokeKyInput,
      karaokeJoysoundInput,
      selectedArtist,
    } = get();
    if (!editingSong) return;

    set({ karaokeSaving: true, karaokeError: null });

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

      set({
        message: {
          type: "success",
          text: "✅ 노래방 번호가 저장되었습니다.",
        },
      });

      if (selectedArtist) {
        const updatedSongs = await getSongsByArtist(selectedArtist.id);
        set({ songs: updatedSongs });
      }

      set({
        showKaraokeDialog: false,
        songMenuOpen: null,
      });
    } catch (error: any) {
      set({
        karaokeError:
          error.message ?? "노래방 번호 저장 중 오류가 발생했습니다.",
      });
    } finally {
      set({ karaokeSaving: false });
    }
  },

  saveTransferOwnership: async () => {
    const { transferSong, selectedArtist, transferArtistIdInput } = get();
    if (!transferSong || !selectedArtist) return;

    const trimmed = transferArtistIdInput.trim();
    const targetId = Number.parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(targetId) || targetId <= 0) {
      set({ transferError: "이전할 아티스트 ID를 올바르게 입력해주세요." });
      return;
    }

    set({ transferSaving: true, transferError: null });

    try {
      await transferSongOwnership(transferSong.id, selectedArtist.id, targetId);
      const refreshed = await getSongsByArtist(selectedArtist.id);
      set({
        songs: refreshed,
        showTransferDialog: false,
        transferSong: null,
        transferArtistIdInput: "",
      });
    } catch (error: any) {
      set({
        transferError: error?.message ?? "소유권 이전 중 오류가 발생했습니다.",
      });
    } finally {
      set({ transferSaving: false });
    }
  },

  saveAddOwnership: async () => {
    const { addOwnershipSong, selectedArtist, addOwnershipArtistIdInput } =
      get();
    if (!addOwnershipSong) return;

    const trimmed = addOwnershipArtistIdInput.trim();
    const targetId = Number.parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(targetId) || targetId <= 0) {
      set({
        addOwnershipError: "추가할 아티스트 ID를 올바르게 입력해주세요.",
      });
      return;
    }

    set({ addOwnershipSaving: true, addOwnershipError: null });

    try {
      await addSongOwnership(addOwnershipSong.id, targetId);
      if (selectedArtist) {
        const refreshed = await getSongsByArtist(selectedArtist.id);
        set({ songs: refreshed });
      }
      set({
        showAddOwnershipDialog: false,
        addOwnershipSong: null,
        addOwnershipArtistIdInput: "",
      });
    } catch (error: any) {
      set({
        addOwnershipError:
          error?.message ?? "소유권 추가 중 오류가 발생했습니다.",
      });
    } finally {
      set({ addOwnershipSaving: false });
    }
  },

  handleDeleteArtist: async () => {
    const { selectedArtist, deletingArtist, sort, debouncedSearch } = get();
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

    set({ deletingArtist: true, message: null });

    try {
      await deleteArtist(selectedArtist.id);
      const res = await getArtists(sort, 100, undefined, debouncedSearch);
      set({
        artists: res.artists,
        artistsHasMore: res.hasMore,
        artistsCursor: res.nextCursor,
        selectedArtist: null,
        songs: [],
        message: {
          type: "success",
          text: "아티스트가 삭제되었습니다.",
        },
      });
    } catch (error: any) {
      set({
        message: {
          type: "error",
          text: error?.message ?? "아티스트 삭제 중 오류가 발생했습니다.",
        },
      });
    } finally {
      set({ deletingArtist: false });
    }
  },

  handleMergeArtist: async () => {
    const { selectedArtist, mergeTargetArtistIdInput, sort, debouncedSearch } =
      get();
    if (!selectedArtist) return;

    const trimmed = mergeTargetArtistIdInput.trim();
    const targetId = Number.parseInt(trimmed, 10);
    if (!trimmed || Number.isNaN(targetId) || targetId <= 0) {
      set({ mergeError: "대상 아티스트 ID를 올바르게 입력해주세요." });
      return;
    }

    set({ mergeSaving: true, mergeError: null });

    try {
      const targetArtist = await getArtistById(targetId);
      if (!targetArtist) {
        set({
          mergeError: "대상 아티스트를 찾을 수 없습니다.",
          mergeSaving: false,
        });
        return;
      }

      if (typeof window !== "undefined") {
        if (
          !window.confirm(
            `정말 ${targetArtist.nameKo} (${targetId})에게 곡을 이전하고, ${selectedArtist.nameKo}(${selectedArtist.id})를 삭제하시겠습니까?`,
          )
        ) {
          set({ mergeSaving: false });
          return;
        }
      }

      await mergeArtist(selectedArtist.id, targetId);
      const res = await getArtists(sort, 100, undefined, debouncedSearch);
      set({
        artists: res.artists,
        artistsHasMore: res.hasMore,
        artistsCursor: res.nextCursor,
        selectedArtist: null,
        songs: [],
        showMergeDialog: false,
        mergeTargetArtistIdInput: "",
        message: {
          type: "success",
          text: "아티스트가 병합되었습니다.",
        },
      });
    } catch (error: any) {
      set({
        mergeError: error?.message ?? "아티스트 병합 중 오류가 발생했습니다.",
      });
    } finally {
      set({ mergeSaving: false });
    }
  },

  handleArtistCatalogChange: async (value: ArtistCatalogOption) => {
    const { selectedArtist, catalogSaving, songs, sort, debouncedSearch } =
      get();
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

    set({ catalogSaving: true });

    try {
      await updateArtistCatalog(selectedArtist.id, value, applyToNullSongs);

      set({
        message: {
          type: "success",
          text: value
            ? `✅ ${selectedArtist.nameKo} 분류가 ${value}로 설정되었습니다.`
            : `✅ ${selectedArtist.nameKo} 분류가 삭제되었습니다.`,
        },
      });

      const [updatedArtists, updatedSongs] = await Promise.all([
        getArtists(sort, 100, undefined, debouncedSearch),
        getSongsByArtist(selectedArtist.id),
      ]);

      const refreshed = updatedArtists.artists.find(
        (artist) => artist.id === selectedArtist.id,
      );

      set({
        artists: updatedArtists.artists,
        artistsHasMore: updatedArtists.hasMore,
        artistsCursor: updatedArtists.nextCursor,
        songs: updatedSongs,
        selectedArtist: refreshed ?? selectedArtist,
        catalogMenuOpen: false,
      });
    } catch (error: any) {
      set({
        message: {
          type: "error",
          text: error?.message ?? "분류 설정 중 오류가 발생했습니다.",
        },
      });
    } finally {
      set({ catalogSaving: false });
    }
  },

  resetDialogStates: () => {
    const { selectedArtist } = get();
    set({
      nameKoMenuOpen: false,
      nameMenuOpen: false,
      slugMenuOpen: false,
      catalogMenuOpen: false,
      catalogSaving: false,
      showNameKoDialog: false,
      showNameDialog: false,
      showSlugDialog: false,
      nameKoError: null,
      nameError: null,
      slugError: null,
      nameKoInput: selectedArtist?.nameKo ?? "",
      nameInput: selectedArtist?.name ?? "",
      slugInput: selectedArtist?.slug ?? "",
    });
  },
}));

export { SORT_OPTIONS, ARTIST_CATALOG_OPTIONS };
export type { Artist, Song, SpotifyTrack, SortOption, ArtistCatalogOption };
