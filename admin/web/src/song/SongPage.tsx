import { useEffect, useRef, useState } from "react";

type ArtistSortBy = "songCount" | "name" | "createdAt";

type ArtistItem = {
  id: number;
  name: string;
  nameKo: string;
  nameJa?: string;
  nameLatin?: string;
  homeCatalog?: string;
  thumbnailMedium?: string;
  songCount: number;
};

type ArtistListResponse = {
  data: ArtistItem[];
  nextOffset: number;
  hasMore: boolean;
  total: number;
};

type ArtistDetail = {
  id: number;
  name: string;
  nameKo: string;
  nameJa?: string;
  nameJaKana?: string;
  nameLatin?: string;
  tjName?: string;
  slug?: string;
  homeCatalog?: string;
  youtubeChannel?: string;
  youtubeTopicChannel?: string;
  spotifyId?: string;
  thumbnailMedium?: string;
};

type SongYoutubeVideo = {
  id: string;
  title: string | null;
  thumbnailMedium: string | null;
  viewCount: string | null;
};

type SongSpotifyTrack = {
  id: string;
  name: string | null;
  releaseDate: string | null;
  albumImage: string | null;
};

type SongItem = {
  id: number;
  title: string;
  titleKo?: string;
  titleJa?: string;
  titleJaPronu?: string;
  titleJaKana?: string;
  titleJaKanji?: string;
  titleLatin?: string;
  titleLatinPronu?: string;
  catalog?: string;
  tjSongId?: string;
  visible: boolean;
  score?: number;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  youtubeVideos: SongYoutubeVideo[];
  spotifyTracks: SongSpotifyTrack[];
  createdAt: string;
  updatedAt: string;
};

type ArtistSongsResponse = {
  artist: ArtistDetail;
  data: SongItem[];
  total: number;
};

type SongEditForm = {
  title: string;
  titleKo: string;
  titleJa: string;
  titleJaKana: string;
  titleJaPronu: string;
  titleJaKanji: string;
  titleLatin: string;
  titleLatinPronu: string;
  catalog: string;
  thumbnailDefault: string;
  thumbnailMedium: string;
  thumbnailHigh: string;
  visible: boolean;
  youtubeVideos: SongYoutubeVideo[];
  spotifyTracks: SongSpotifyTrack[];
  newYoutubeVideoId: string;
  newSpotifyTrackId: string;
};

const artistPageSize = 40;

export function SongPage() {
  const [draftArtistSearch, setDraftArtistSearch] = useState("");
  const [artistSearch, setArtistSearch] = useState("");
  const [artistSort, setArtistSort] = useState<ArtistSortBy>("songCount");
  const [hasSongsOnly, setHasSongsOnly] = useState(true);
  const [artists, setArtists] = useState<ArtistItem[]>([]);
  const [artistNextOffset, setArtistNextOffset] = useState(0);
  const [artistHasMore, setArtistHasMore] = useState(false);
  const [artistTotal, setArtistTotal] = useState(0);
  const [isArtistLoading, setIsArtistLoading] = useState(false);
  const [artistError, setArtistError] = useState<string>();
  const artistLoadMoreRef = useRef<HTMLDivElement>(null);

  const [selectedArtistId, setSelectedArtistId] = useState<number | undefined>(
    parseArtistIdFromUrl(),
  );
  const [artistDetail, setArtistDetail] = useState<ArtistDetail>();
  const [songs, setSongs] = useState<SongItem[]>([]);
  const [draftSongSearch, setDraftSongSearch] = useState("");
  const [songSearch, setSongSearch] = useState("");
  const [isSongLoading, setIsSongLoading] = useState(false);
  const [songError, setSongError] = useState<string>();

  const [editingSongId, setEditingSongId] = useState<number>();
  const [editForm, setEditForm] = useState<SongEditForm>();
  const [pendingSongId, setPendingSongId] = useState<number>();

  useEffect(() => {
    void loadFirstArtistPage();
  }, [artistSearch, artistSort, hasSongsOnly]);

  useEffect(() => {
    const target = artistLoadMoreRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (entry?.isIntersecting && artistHasMore && !isArtistLoading) {
        void loadMoreArtists();
      }
    });

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [artistHasMore, isArtistLoading, artistNextOffset, artistSearch, artistSort, hasSongsOnly]);

  useEffect(() => {
    if (selectedArtistId === undefined) {
      setArtistDetail(undefined);
      setSongs([]);
      return;
    }

    void loadSongs(selectedArtistId, songSearch);
  }, [selectedArtistId, songSearch]);

  async function loadFirstArtistPage() {
    setIsArtistLoading(true);
    setArtistError(undefined);

    try {
      const result = await fetchArtists(
        { search: artistSearch, sortBy: artistSort, hasSongsOnly },
        0,
      );
      setArtists(result.data);
      setArtistNextOffset(result.nextOffset);
      setArtistHasMore(result.hasMore);
      setArtistTotal(result.total);
    } catch (fetchError) {
      setArtists([]);
      setArtistNextOffset(0);
      setArtistHasMore(false);
      setArtistTotal(0);
      setArtistError(String(fetchError));
    } finally {
      setIsArtistLoading(false);
    }
  }

  async function loadMoreArtists() {
    setIsArtistLoading(true);
    setArtistError(undefined);

    try {
      const result = await fetchArtists(
        { search: artistSearch, sortBy: artistSort, hasSongsOnly },
        artistNextOffset,
      );
      setArtists((current) => [...current, ...result.data]);
      setArtistNextOffset(result.nextOffset);
      setArtistHasMore(result.hasMore);
      setArtistTotal(result.total);
    } catch (fetchError) {
      setArtistError(String(fetchError));
    } finally {
      setIsArtistLoading(false);
    }
  }

  async function loadSongs(artistId: number, search: string) {
    setIsSongLoading(true);
    setSongError(undefined);

    try {
      const result = await fetchArtistSongs(artistId, search);
      setArtistDetail(result.artist);
      setSongs(result.data);
    } catch (fetchError) {
      setArtistDetail(undefined);
      setSongs([]);
      setSongError(String(fetchError));
    } finally {
      setIsSongLoading(false);
    }
  }

  function selectArtist(artistId: number) {
    setSelectedArtistId(artistId);
    setDraftSongSearch("");
    setSongSearch("");
    setEditingSongId(undefined);
    setEditForm(undefined);
    writeArtistIdToUrl(artistId);
  }

  function applyArtistSearch() {
    setArtistSearch(draftArtistSearch.trim());
  }

  function applySongSearch() {
    setSongSearch(draftSongSearch.trim());
  }

  function startEditSong(song: SongItem) {
    setEditingSongId(song.id);
    setEditForm({
      title: song.title,
      titleKo: song.titleKo ?? "",
      titleJa: song.titleJa ?? "",
      titleJaKana: song.titleJaKana ?? "",
      titleJaPronu: song.titleJaPronu ?? "",
      titleJaKanji: song.titleJaKanji ?? "",
      titleLatin: song.titleLatin ?? "",
      titleLatinPronu: song.titleLatinPronu ?? "",
      catalog: song.catalog ?? "",
      thumbnailDefault: song.thumbnailDefault ?? "",
      thumbnailMedium: song.thumbnailMedium ?? "",
      thumbnailHigh: song.thumbnailHigh ?? "",
      visible: song.visible,
      youtubeVideos: song.youtubeVideos,
      spotifyTracks: song.spotifyTracks,
      newYoutubeVideoId: "",
      newSpotifyTrackId: "",
    });
  }

  function cancelEditSong() {
    setEditingSongId(undefined);
    setEditForm(undefined);
  }

  function updateEditForm<K extends keyof SongEditForm>(
    key: K,
    value: SongEditForm[K],
  ) {
    setEditForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function saveEditSong(songId: number) {
    if (!editForm || selectedArtistId === undefined) {
      return;
    }

    if (!editForm.title.trim()) {
      alert("title은 필수입니다.");
      return;
    }

    setPendingSongId(songId);

    try {
      await patchSong(songId, {
        title: editForm.title,
        titleKo: editForm.titleKo,
        titleJa: editForm.titleJa,
        titleJaKana: editForm.titleJaKana,
        titleJaPronu: editForm.titleJaPronu,
        titleJaKanji: editForm.titleJaKanji,
        titleLatin: editForm.titleLatin,
        titleLatinPronu: editForm.titleLatinPronu,
        catalog: editForm.catalog,
        thumbnailDefault: editForm.thumbnailDefault,
        thumbnailMedium: editForm.thumbnailMedium,
        thumbnailHigh: editForm.thumbnailHigh,
        visible: editForm.visible,
        youtubeVideoIds: editForm.youtubeVideos.map((video) => video.id),
        spotifyTrackIds: editForm.spotifyTracks.map((track) => track.id),
      });
      setEditingSongId(undefined);
      setEditForm(undefined);
      await loadSongs(selectedArtistId, songSearch);
    } catch (saveError) {
      alert(`저장 실패: ${String(saveError)}`);
    } finally {
      setPendingSongId(undefined);
    }
  }

  async function toggleVisible(song: SongItem) {
    setPendingSongId(song.id);

    try {
      await patchSong(song.id, { visible: !song.visible });
      setSongs((current) =>
        current.map((item) =>
          item.id === song.id ? { ...item, visible: !song.visible } : item,
        ),
      );
    } catch (toggleError) {
      alert(`visible 변경 실패: ${String(toggleError)}`);
    } finally {
      setPendingSongId(undefined);
    }
  }

  async function deleteSong(song: SongItem) {
    const confirmed = window.confirm(
      `곡 "${song.title}" (id: ${song.id})을(를) 삭제할까요?\n가수/유튜브/스포티파이 연결도 함께 삭제됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setPendingSongId(song.id);

    try {
      const response = await fetch(`/api/song/${song.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }

      setSongs((current) => current.filter((item) => item.id !== song.id));
      setArtists((current) =>
        current.map((artist) =>
          artist.id === selectedArtistId
            ? { ...artist, songCount: Math.max(0, artist.songCount - 1) }
            : artist,
        ),
      );
    } catch (deleteError) {
      alert(`삭제 실패: ${String(deleteError)}`);
    } finally {
      setPendingSongId(undefined);
    }
  }

  return (
    <main className="flex h-screen flex-col p-6 text-gray-950">
      <div>
        <a
          className="cursor-pointer text-sm text-gray-600 underline"
          href="/admin"
        >
          Admin
        </a>
        <h1 className="mt-3 text-2xl font-semibold">Song</h1>
        <p className="mt-2 text-gray-600">
          가수를 선택하면 해당 가수의 곡들을 조회/수정/삭제할 수 있습니다.
        </p>
      </div>

      <div className="mt-6 flex min-h-0 flex-1 gap-6">
        <aside
          aria-label="아티스트 목록"
          className="flex w-80 shrink-0 flex-col border border-gray-300"
        >
          <div className="border-b border-gray-300 p-3">
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                applyArtistSearch();
              }}
            >
              <input
                className="w-full border border-gray-300 px-2 py-1.5"
                placeholder="가수 검색 (모든 표기)"
                value={draftArtistSearch}
                onChange={(event) => setDraftArtistSearch(event.target.value)}
              />
              <button
                type="submit"
                className="cursor-pointer border border-gray-900 px-3 py-1.5"
              >
                검색
              </button>
            </form>
            <div className="mt-2 flex items-center gap-3">
              <select
                className="cursor-pointer border border-gray-300 px-2 py-1"
                value={artistSort}
                onChange={(event) =>
                  setArtistSort(parseArtistSortBy(event.target.value))
                }
              >
                <option value="songCount">곡 많은 순</option>
                <option value="name">이름 순</option>
                <option value="createdAt">최근 등록 순</option>
              </select>
              <label className="flex cursor-pointer items-center gap-1 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={hasSongsOnly}
                  onChange={(event) => setHasSongsOnly(event.target.checked)}
                />
                곡 있는 가수만
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              {artists.length.toLocaleString()} /{" "}
              {artistTotal.toLocaleString()}명 표시
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {artistError && <p className="p-3 text-red-700">{artistError}</p>}

            <ul>
              {artists.map((artist) => (
                <li key={artist.id}>
                  <button
                    type="button"
                    className={`flex w-full cursor-pointer items-center gap-3 border-b border-gray-200 p-3 text-left hover:bg-gray-100 ${
                      artist.id === selectedArtistId ? "bg-blue-50" : ""
                    }`}
                    onClick={() => selectArtist(artist.id)}
                  >
                    {artist.thumbnailMedium ? (
                      <img
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                        src={artist.thumbnailMedium}
                      />
                    ) : (
                      <span className="h-10 w-10 shrink-0 rounded-full bg-gray-200" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {artist.name}
                      </span>
                      <span className="block truncate text-sm text-gray-600">
                        {artist.nameKo}
                        {artist.nameLatin ? ` · ${artist.nameLatin}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700">
                      {artist.songCount}곡
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            {!isArtistLoading && artists.length === 0 && !artistError && (
              <p className="p-3 text-gray-600">검색 결과가 없습니다.</p>
            )}

            <div ref={artistLoadMoreRef} className="h-8" />

            {isArtistLoading && (
              <p className="p-3 text-gray-600">불러오는 중</p>
            )}
          </div>
        </aside>

        <section
          aria-label="곡 목록"
          className="min-h-0 min-w-0 flex-1 overflow-y-auto"
        >
          {selectedArtistId === undefined && (
            <p className="text-gray-600">
              왼쪽에서 가수를 선택하면 곡 목록이 표시됩니다.
            </p>
          )}

          {selectedArtistId !== undefined && (
            <>
              {songError && <p className="text-red-700">{songError}</p>}

              {artistDetail && (
                <header className="flex items-start gap-4 border border-gray-300 p-4">
                  {artistDetail.thumbnailMedium ? (
                    <img
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                      src={artistDetail.thumbnailMedium}
                    />
                  ) : (
                    <span className="h-16 w-16 rounded-full bg-gray-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold">
                      {artistDetail.name}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      {[
                        artistDetail.nameKo,
                        artistDetail.nameJa,
                        artistDetail.nameLatin,
                        artistDetail.tjName && `TJ: ${artistDetail.tjName}`,
                        artistDetail.slug && `slug: ${artistDetail.slug}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-3 text-sm">
                      {artistDetail.youtubeChannel && (
                        <a
                          className="text-red-700 underline"
                          href={`https://www.youtube.com/channel/${artistDetail.youtubeChannel}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          유튜브 채널
                        </a>
                      )}
                      {artistDetail.youtubeTopicChannel && (
                        <a
                          className="text-red-700 underline"
                          href={`https://www.youtube.com/channel/${artistDetail.youtubeTopicChannel}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          토픽 채널
                        </a>
                      )}
                      {artistDetail.spotifyId && (
                        <a
                          className="text-green-700 underline"
                          href={`https://open.spotify.com/artist/${artistDetail.spotifyId}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          스포티파이
                        </a>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm text-gray-600">
                    {songs.length.toLocaleString()}곡
                  </p>
                </header>
              )}

              <form
                className="mt-4 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  applySongSearch();
                }}
              >
                <input
                  className="w-full max-w-md border border-gray-300 px-2 py-1.5"
                  placeholder="곡 검색 (모든 표기/TJ번호)"
                  value={draftSongSearch}
                  onChange={(event) => setDraftSongSearch(event.target.value)}
                />
                <button
                  type="submit"
                  className="cursor-pointer border border-gray-900 px-3 py-1.5"
                >
                  검색
                </button>
                {songSearch && (
                  <button
                    type="button"
                    className="cursor-pointer border border-gray-300 px-3 py-1.5 text-gray-700"
                    onClick={() => {
                      setDraftSongSearch("");
                      setSongSearch("");
                    }}
                  >
                    초기화
                  </button>
                )}
              </form>

              {isSongLoading && <p className="mt-4 text-gray-600">불러오는 중</p>}

              {!isSongLoading && songs.length === 0 && !songError && (
                <p className="mt-4 text-gray-600">곡이 없습니다.</p>
              )}

              <ul className="mt-4 grid gap-4">
                {songs.map((song) => (
                  <li className="border border-gray-300 p-4" key={song.id}>
                    <div className="flex items-start gap-4">
                      {song.thumbnailMedium ? (
                        <img
                          alt=""
                          className="h-20 w-20 shrink-0 object-cover"
                          src={song.thumbnailMedium}
                        />
                      ) : (
                        <span className="h-20 w-20 shrink-0 bg-gray-200" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {song.title}
                          </h3>
                          {song.catalog && (
                            <span
                              className={`px-1.5 py-0.5 text-xs ${getCatalogBadgeClassName(song.catalog)}`}
                            >
                              {song.catalog}
                            </span>
                          )}
                          <button
                            type="button"
                            className={`cursor-pointer border px-1.5 py-0.5 text-xs ${
                              song.visible
                                ? "border-green-700 text-green-700"
                                : "border-gray-400 text-gray-500"
                            }`}
                            disabled={pendingSongId === song.id}
                            title="클릭해서 visible 토글"
                            onClick={() => void toggleVisible(song)}
                          >
                            {song.visible ? "공개" : "비공개"}
                          </button>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {[
                            song.titleKo && `한글: ${song.titleKo}`,
                            song.titleJaKana && `가나: ${song.titleJaKana}`,
                            song.titleLatin && `라틴: ${song.titleLatin}`,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "제목 변형 없음"}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          id: {song.id}
                          {song.tjSongId && ` · TJ번호: ${song.tjSongId}`}
                          {` · 생성: ${formatDate(song.createdAt)}`}
                        </p>

                        {song.youtubeVideos.length > 0 && (
                          <p className="mt-2 flex flex-wrap gap-2">
                            {song.youtubeVideos.map((video) => (
                              <a
                                className="inline-flex max-w-xs items-center gap-1 border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800"
                                href={`https://www.youtube.com/watch?v=${video.id}`}
                                key={video.id}
                                rel="noreferrer"
                                target="_blank"
                                title={video.title ?? video.id}
                              >
                                <span className="truncate">
                                  ▶ {video.title ?? video.id}
                                </span>
                                {video.viewCount && (
                                  <span className="shrink-0 text-red-500">
                                    {formatViewCount(video.viewCount)}
                                  </span>
                                )}
                              </a>
                            ))}
                          </p>
                        )}

                        {song.spotifyTracks.length > 0 && (
                          <p className="mt-2 flex flex-wrap gap-2">
                            {song.spotifyTracks.map((track) => (
                              <a
                                className="inline-flex max-w-xs items-center gap-1 border border-green-200 bg-green-50 px-2 py-1 text-xs text-green-800"
                                href={`https://open.spotify.com/track/${track.id}`}
                                key={track.id}
                                rel="noreferrer"
                                target="_blank"
                                title={track.name ?? track.id}
                              >
                                <span className="truncate">
                                  ♫ {track.name ?? track.id}
                                </span>
                                {track.releaseDate && (
                                  <span className="shrink-0 text-green-600">
                                    {track.releaseDate}
                                  </span>
                                )}
                              </a>
                            ))}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        {editingSongId === song.id ? (
                          <button
                            type="button"
                            className="cursor-pointer border border-gray-300 px-3 py-1.5 text-gray-700"
                            onClick={cancelEditSong}
                          >
                            닫기
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="cursor-pointer border border-gray-900 px-3 py-1.5"
                            onClick={() => startEditSong(song)}
                          >
                            수정
                          </button>
                        )}
                        <button
                          type="button"
                          className="cursor-pointer border border-red-700 px-3 py-1.5 text-red-700"
                          disabled={pendingSongId === song.id}
                          onClick={() => void deleteSong(song)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    {editingSongId === song.id && editForm && (
                      <div className="mt-4 border-t border-gray-200 pt-4">
                        <div className="grid gap-3 md:grid-cols-3">
                          <EditField
                            label="title (필수)"
                            value={editForm.title}
                            onChange={(value) => updateEditForm("title", value)}
                          />
                          <EditField
                            label="titleKo"
                            value={editForm.titleKo}
                            onChange={(value) =>
                              updateEditForm("titleKo", value)
                            }
                          />
                          <EditField
                            label="titleJa"
                            value={editForm.titleJa}
                            onChange={(value) =>
                              updateEditForm("titleJa", value)
                            }
                          />
                          <EditField
                            label="titleJaKana"
                            value={editForm.titleJaKana}
                            onChange={(value) =>
                              updateEditForm("titleJaKana", value)
                            }
                          />
                          <EditField
                            label="titleJaPronu"
                            value={editForm.titleJaPronu}
                            onChange={(value) =>
                              updateEditForm("titleJaPronu", value)
                            }
                          />
                          <EditField
                            label="titleJaKanji"
                            value={editForm.titleJaKanji}
                            onChange={(value) =>
                              updateEditForm("titleJaKanji", value)
                            }
                          />
                          <EditField
                            label="titleLatin"
                            value={editForm.titleLatin}
                            onChange={(value) =>
                              updateEditForm("titleLatin", value)
                            }
                          />
                          <EditField
                            label="titleLatinPronu"
                            value={editForm.titleLatinPronu}
                            onChange={(value) =>
                              updateEditForm("titleLatinPronu", value)
                            }
                          />
                          <EditField
                            label="catalog"
                            value={editForm.catalog}
                            onChange={(value) =>
                              updateEditForm("catalog", value)
                            }
                          />
                          <EditField
                            label="thumbnailDefault"
                            value={editForm.thumbnailDefault}
                            onChange={(value) =>
                              updateEditForm("thumbnailDefault", value)
                            }
                          />
                          <EditField
                            label="thumbnailMedium"
                            value={editForm.thumbnailMedium}
                            onChange={(value) =>
                              updateEditForm("thumbnailMedium", value)
                            }
                          />
                          <EditField
                            label="thumbnailHigh"
                            value={editForm.thumbnailHigh}
                            onChange={(value) =>
                              updateEditForm("thumbnailHigh", value)
                            }
                          />
                        </div>

                        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editForm.visible}
                            onChange={(event) =>
                              updateEditForm("visible", event.target.checked)
                            }
                          />
                          공개 (visible)
                        </label>

                        <MediaIdEditor
                          addPlaceholder="유튜브 영상 ID 추가"
                          items={editForm.youtubeVideos.map((video) => ({
                            id: video.id,
                            label: video.title ?? video.id,
                          }))}
                          newId={editForm.newYoutubeVideoId}
                          title="유튜브 영상"
                          onAdd={() => {
                            const newId = editForm.newYoutubeVideoId.trim();

                            if (!newId) {
                              return;
                            }

                            if (
                              editForm.youtubeVideos.some(
                                (video) => video.id === newId,
                              )
                            ) {
                              updateEditForm("newYoutubeVideoId", "");
                              return;
                            }

                            updateEditForm("youtubeVideos", [
                              ...editForm.youtubeVideos,
                              {
                                id: newId,
                                title: null,
                                thumbnailMedium: null,
                                viewCount: null,
                              },
                            ]);
                            updateEditForm("newYoutubeVideoId", "");
                          }}
                          onChangeNewId={(value) =>
                            updateEditForm("newYoutubeVideoId", value)
                          }
                          onRemove={(id) =>
                            updateEditForm(
                              "youtubeVideos",
                              editForm.youtubeVideos.filter(
                                (video) => video.id !== id,
                              ),
                            )
                          }
                        />

                        <MediaIdEditor
                          addPlaceholder="스포티파이 트랙 ID 추가"
                          items={editForm.spotifyTracks.map((track) => ({
                            id: track.id,
                            label: track.name ?? track.id,
                          }))}
                          newId={editForm.newSpotifyTrackId}
                          title="스포티파이 트랙"
                          onAdd={() => {
                            const newId = editForm.newSpotifyTrackId.trim();

                            if (!newId) {
                              return;
                            }

                            if (
                              editForm.spotifyTracks.some(
                                (track) => track.id === newId,
                              )
                            ) {
                              updateEditForm("newSpotifyTrackId", "");
                              return;
                            }

                            updateEditForm("spotifyTracks", [
                              ...editForm.spotifyTracks,
                              {
                                id: newId,
                                name: null,
                                releaseDate: null,
                                albumImage: null,
                              },
                            ]);
                            updateEditForm("newSpotifyTrackId", "");
                          }}
                          onChangeNewId={(value) =>
                            updateEditForm("newSpotifyTrackId", value)
                          }
                          onRemove={(id) =>
                            updateEditForm(
                              "spotifyTracks",
                              editForm.spotifyTracks.filter(
                                (track) => track.id !== id,
                              ),
                            )
                          }
                        />

                        <div className="mt-4 flex gap-2">
                          <button
                            type="button"
                            className="cursor-pointer border border-gray-900 bg-gray-900 px-4 py-1.5 text-white disabled:opacity-50"
                            disabled={pendingSongId === song.id}
                            onClick={() => void saveEditSong(song.id)}
                          >
                            {pendingSongId === song.id ? "저장 중" : "저장"}
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer border border-gray-300 px-4 py-1.5 text-gray-700"
                            onClick={cancelEditSong}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm text-gray-700">{label}</span>
      <input
        className="mt-1 w-full border border-gray-300 px-2 py-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function MediaIdEditor({
  title,
  items,
  newId,
  addPlaceholder,
  onAdd,
  onChangeNewId,
  onRemove,
}: {
  title: string;
  items: Array<{ id: string; label: string }>;
  newId: string;
  addPlaceholder: string;
  onAdd: () => void;
  onChangeNewId: (value: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-gray-700">
        {title} ({items.length})
      </p>
      <ul className="mt-1 grid gap-1">
        {items.map((item) => (
          <li
            className="flex items-center gap-2 border border-gray-200 px-2 py-1 text-sm"
            key={item.id}
          >
            <span className="min-w-0 flex-1 truncate" title={item.label}>
              {item.label}
            </span>
            <span className="shrink-0 text-xs text-gray-400">{item.id}</span>
            <button
              type="button"
              className="shrink-0 cursor-pointer text-red-700 underline"
              onClick={() => onRemove(item.id)}
            >
              제거
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex gap-2">
        <input
          className="w-full max-w-xs border border-gray-300 px-2 py-1 text-sm"
          placeholder={addPlaceholder}
          value={newId}
          onChange={(event) => onChangeNewId(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAdd();
            }
          }}
        />
        <button
          type="button"
          className="cursor-pointer border border-gray-300 px-2 py-1 text-sm"
          onClick={onAdd}
        >
          추가
        </button>
      </div>
    </div>
  );
}

async function fetchArtists(
  options: { search: string; sortBy: ArtistSortBy; hasSongsOnly: boolean },
  offset: number,
): Promise<ArtistListResponse> {
  const params = new URLSearchParams({
    sortBy: options.sortBy,
    offset: offset.toString(),
    limit: artistPageSize.toString(),
  });

  if (options.search) {
    params.set("search", options.search);
  }

  if (options.hasSongsOnly) {
    params.set("hasSongsOnly", "true");
  }

  const response = await fetch(`/api/song/artists?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body: ArtistListResponse = await response.json();
  return body;
}

async function fetchArtistSongs(
  artistId: number,
  search: string,
): Promise<ArtistSongsResponse> {
  const params = new URLSearchParams();

  if (search) {
    params.set("search", search);
  }

  const query = params.toString();
  const response = await fetch(
    `/api/song/artists/${artistId}/songs${query ? `?${query}` : ""}`,
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body: ArtistSongsResponse = await response.json();
  return body;
}

async function patchSong(
  songId: number,
  body: Record<string, unknown>,
): Promise<void> {
  const response = await fetch(`/api/song/${songId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
}

function parseArtistSortBy(value: string): ArtistSortBy {
  if (value === "name" || value === "createdAt") {
    return value;
  }

  return "songCount";
}

function getCatalogBadgeClassName(catalog: string): string {
  const normalizedCatalog = catalog.toUpperCase();

  if (normalizedCatalog === "JPOP") {
    return "bg-red-50 text-red-800";
  }

  if (normalizedCatalog === "KPOP") {
    return "bg-blue-50 text-blue-800";
  }

  if (normalizedCatalog === "POP") {
    return "bg-green-50 text-green-800";
  }

  if (normalizedCatalog === "CPOP") {
    return "bg-yellow-50 text-yellow-800";
  }

  return "bg-gray-100 text-gray-700";
}

function formatViewCount(viewCount: string): string {
  const parsed = Number(viewCount);

  if (!Number.isFinite(parsed)) {
    return viewCount;
  }

  return `${parsed.toLocaleString()}회`;
}

function formatDate(value: string): string {
  return value.slice(0, 10);
}

function parseArtistIdFromUrl(): number | undefined {
  const params = new URLSearchParams(window.location.search);
  const artistId = Number(params.get("artistId"));

  return Number.isInteger(artistId) && artistId > 0 ? artistId : undefined;
}

function writeArtistIdToUrl(artistId: number) {
  window.history.replaceState(null, "", `/admin/song?artistId=${artistId}`);
}
