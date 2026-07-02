import { type ReactNode, useEffect, useState } from "react";

type QueueYoutubeVideo = {
  id: string;
  title: string;
  thumbnailMedium: string | null;
  viewCount: string | null;
};

type QueueSpotifyTrack = {
  id: string;
  name: string;
  releaseDate: string | null;
  albumImage: string | null;
};

type CurrentSongMedia = {
  id: string;
  label: string;
};

type CurrentSong = {
  title: string;
  titleKo?: string;
  titleJa?: string;
  titleJaPronu?: string;
  titleJaKana?: string;
  titleJaKanji?: string;
  titleLatin?: string;
  titleLatinPronu?: string;
  catalog?: string;
  visible: boolean;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  youtubeVideos: CurrentSongMedia[];
  spotifyTracks: CurrentSongMedia[];
};

type SongUpdateQueueItem = {
  id: number;
  songId: number;
  title: string;
  titleKo?: string;
  titleJa?: string;
  titleJaPronu?: string;
  titleJaKana?: string;
  titleJaKanji?: string;
  titleLatin?: string;
  titleLatinPronu?: string;
  youtubeVideos: QueueYoutubeVideo[];
  spotifyTracks: QueueSpotifyTrack[];
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  artistId?: number;
  artistName?: string;
  currentSong?: CurrentSong;
  createdAt: string;
  updatedAt: string;
};

type SongUpdateQueueListResponse = {
  data: SongUpdateQueueItem[];
};

type ApplySongUpdateResponse = {
  songId: number;
};

type SpotifyTrackCandidate = {
  id: string;
  name: string;
  isrc: string | null;
  durationMs: number | null;
  releaseDate: string | null;
  albumImages: string[];
};

type YoutubeVideoCandidate = {
  id: string;
  channelId: string | null;
  title: string;
  publishedAt: string | null;
  thumbnailDefault: string | null;
  thumbnailMedium: string | null;
  thumbnailHigh: string | null;
  viewCount: string | null;
  likeCount: string | null;
};

type SongMediaCandidatesResponse = {
  titleJa: string | null;
  titleLatin: string | null;
  spotifyTracks: SpotifyTrackCandidate[];
  youtubeVideos: YoutubeVideoCandidate[];
};

type SongForm = {
  catalog: string;
  title: string;
  titleKo: string;
  titleJa: string;
  titleJaKana: string;
  titleJaPronu: string;
  titleJaKanji: string;
  titleLatin: string;
  titleLatinPronu: string;
  youtubeVideos: QueueYoutubeVideo[];
  spotifyTracks: QueueSpotifyTrack[];
  thumbnailDefault: string;
  thumbnailMedium: string;
  thumbnailHigh: string;
};

export function SongUpdateQueuePage() {
  const [items, setItems] = useState<SongUpdateQueueItem[]>();
  const [selectedId, setSelectedId] = useState<number>();
  const [form, setForm] = useState<SongForm>();
  const [candidates, setCandidates] = useState<SongMediaCandidatesResponse>();
  const [isCandidatesLoading, setIsCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadItems() {
      try {
        const result = await fetchSongUpdateQueue();
        setItems(result);
        setError(undefined);

        if (result.length > 0) {
          selectItem(result[0]);
        }
      } catch (fetchError) {
        setItems(undefined);
        setSelectedId(undefined);
        setForm(undefined);
        setError(String(fetchError));
      }
    }

    void loadItems();
  }, []);

  const selectedItem = items?.find((item) => item.id === selectedId);

  function selectItem(item: SongUpdateQueueItem) {
    setSelectedId(item.id);
    setForm(createFormFromItem(item));
    setMessage(undefined);
    setError(undefined);
    void loadCandidates(item.id);
  }

  async function loadCandidates(queueId: number) {
    setCandidates(undefined);
    setCandidatesError(undefined);
    setIsCandidatesLoading(true);

    try {
      const result = await fetchMediaCandidates(queueId);
      setCandidates(result);
    } catch (candidatesFetchError) {
      setCandidatesError(String(candidatesFetchError));
    } finally {
      setIsCandidatesLoading(false);
    }
  }

  function updateForm<K extends keyof SongForm>(key: K, value: SongForm[K]) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: value,
      };
    });
  }

  function toggleYoutubeVideo(video: QueueYoutubeVideo) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        youtubeVideos: toggleById(current.youtubeVideos, video),
      };
    });
  }

  function toggleSpotifyTrack(track: QueueSpotifyTrack) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        spotifyTracks: toggleById(current.spotifyTracks, track),
      };
    });
  }

  function applyThumbnails(video: YoutubeVideoCandidate) {
    setForm((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        thumbnailDefault: video.thumbnailDefault ?? "",
        thumbnailMedium: video.thumbnailMedium ?? "",
        thumbnailHigh: video.thumbnailHigh ?? "",
      };
    });
  }

  async function deleteSelectedItem(item: SongUpdateQueueItem) {
    const confirmed = window.confirm(
      `${item.title} 큐 항목을 삭제할까요? 이 동작은 song_update_queue에서만 삭제하고 곡은 그대로 둡니다.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteSongUpdateQueueItem(item.id);
      removeItemFromPage(item.id);
      setMessage("큐 항목을 삭제했습니다.");
      setError(undefined);
    } catch (deleteError) {
      setError(String(deleteError));
      setMessage(undefined);
    }
  }

  async function applyUpdate() {
    if (!selectedItem || !form) {
      return;
    }

    const confirmed = window.confirm(
      `songId=${selectedItem.songId} 곡을 폼 값으로 업데이트할까요? 미디어 연결은 추가만 되고 기존 연결은 유지됩니다.`,
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await applySongUpdate(selectedItem.id, form);
      removeItemFromPage(selectedItem.id);
      setMessage(`곡을 업데이트했습니다. songId=${result.songId}`);
      setError(undefined);
    } catch (applyError) {
      setError(String(applyError));
      setMessage(undefined);
    } finally {
      setIsSubmitting(false);
    }
  }

  function removeItemFromPage(itemId: number) {
    setItems((current) => {
      if (!current) {
        return current;
      }

      const nextItems = current.filter((item) => item.id !== itemId);

      if (selectedId === itemId) {
        const nextSelectedItem = nextItems[0];

        if (nextSelectedItem) {
          setSelectedId(nextSelectedItem.id);
          setForm(createFormFromItem(nextSelectedItem));
          void loadCandidates(nextSelectedItem.id);
        } else {
          setSelectedId(undefined);
          setForm(undefined);
          setCandidates(undefined);
        }
      }

      return nextItems;
    });
  }

  const currentSong = selectedItem?.currentSong;
  const linkedYoutubeIds = new Set(
    currentSong?.youtubeVideos.map((video) => video.id) ?? [],
  );
  const linkedSpotifyIds = new Set(
    currentSong?.spotifyTracks.map((track) => track.id) ?? [],
  );

  return (
    <main className="max-w-7xl p-6 text-gray-950">
      <a
        className="cursor-pointer text-sm text-gray-600 underline"
        href="/admin"
      >
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">곡 업데이트 큐 상태</h1>
      <p className="mt-2 text-gray-600">
        song_update_queue 항목을 보고, 기존 곡 값과 비교해 업데이트합니다.
        미디어 연결은 추가만 됩니다.
      </p>

      {error && <p className="mt-4 text-red-700">{error}</p>}
      {message && <p className="mt-4 text-green-700">{message}</p>}

      {!error && !items && <p className="mt-4 text-gray-600">불러오는 중</p>}

      {!error && items && items.length === 0 && (
        <p className="mt-4 text-gray-600">큐 항목이 없습니다.</p>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[420px_1fr]">
          <section aria-labelledby="song-update-queue-list-heading">
            <h2
              id="song-update-queue-list-heading"
              className="text-lg font-semibold"
            >
              큐 리스트
            </h2>
            <div className="mt-3 border border-gray-300">
              {items.map((item) => {
                const isSelected = item.id === selectedId;

                return (
                  <div
                    className={`border-b border-gray-200 p-3 last:border-b-0 ${
                      isSelected ? "bg-yellow-50" : ""
                    }`}
                    key={item.id}
                  >
                    <button
                      type="button"
                      className="block w-full cursor-pointer text-left"
                      onClick={() => selectItem(item)}
                    >
                      <span className="block font-medium">
                        {item.currentSong?.title ?? item.title}
                      </span>
                      <span className="mt-1 block text-sm text-gray-700">
                        {item.artistName ?? "-"} / song {item.songId}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        후보 유튜브 {item.youtubeVideos.length}개 · 스포티파이{" "}
                        {item.spotifyTracks.length}개 ·{" "}
                        {formatCreatedAt(item.createdAt)}
                      </span>
                    </button>
                    <button
                      type="button"
                      className="mt-2 cursor-pointer border border-red-700 px-2 py-1 text-sm text-red-700"
                      onClick={() => deleteSelectedItem(item)}
                    >
                      삭제
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="song-update-form-heading">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2
                  id="song-update-form-heading"
                  className="text-lg font-semibold"
                >
                  곡 업데이트 폼
                </h2>
                {selectedItem && (
                  <p className="mt-1 text-sm text-gray-600">
                    가수: {selectedItem.artistName ?? "미연결"} · songId:{" "}
                    {selectedItem.songId} · 현재 제목:{" "}
                    {currentSong?.title ?? "(곡 삭제됨)"}
                  </p>
                )}
              </div>
              <button
                type="button"
                className="cursor-pointer border border-gray-900 px-3 py-1.5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                disabled={
                  !selectedItem || !form || !currentSong || isSubmitting
                }
                onClick={applyUpdate}
              >
                {isSubmitting ? "업데이트 중" : "곡 업데이트"}
              </button>
            </div>

            {selectedItem && form && (
              <form
                className="mt-3 grid gap-4"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput
                    label="catalog"
                    currentValue={currentSong?.catalog}
                    value={form.catalog}
                    onChange={(value) => updateForm("catalog", value)}
                  />
                  <TextInput
                    label="title"
                    required
                    currentValue={currentSong?.title}
                    value={form.title}
                    onChange={(value) => updateForm("title", value)}
                  />
                  <TextInput
                    label="titleKo"
                    currentValue={currentSong?.titleKo}
                    value={form.titleKo}
                    onChange={(value) => updateForm("titleKo", value)}
                  />
                  <TextInput
                    label="titleJa"
                    currentValue={currentSong?.titleJa}
                    value={form.titleJa}
                    onChange={(value) => updateForm("titleJa", value)}
                  />
                  <TextInput
                    label="titleJaKana"
                    currentValue={currentSong?.titleJaKana}
                    value={form.titleJaKana}
                    onChange={(value) => updateForm("titleJaKana", value)}
                  />
                  <TextInput
                    label="titleJaPronu"
                    currentValue={currentSong?.titleJaPronu}
                    value={form.titleJaPronu}
                    onChange={(value) => updateForm("titleJaPronu", value)}
                  />
                  <TextInput
                    label="titleJaKanji"
                    currentValue={currentSong?.titleJaKanji}
                    value={form.titleJaKanji}
                    onChange={(value) => updateForm("titleJaKanji", value)}
                  />
                  <TextInput
                    label="titleLatin"
                    currentValue={currentSong?.titleLatin}
                    value={form.titleLatin}
                    onChange={(value) => updateForm("titleLatin", value)}
                  />
                  <TextInput
                    label="titleLatinPronu"
                    currentValue={currentSong?.titleLatinPronu}
                    value={form.titleLatinPronu}
                    onChange={(value) => updateForm("titleLatinPronu", value)}
                  />
                </div>

                {currentSong && (
                  <div className="grid gap-3">
                    <LinkedMediaList
                      label="현재 연결된 유튜브 (유지됨)"
                      items={currentSong.youtubeVideos.map((video) => ({
                        id: video.id,
                        label: video.label,
                        url: `https://www.youtube.com/watch?v=${video.id}`,
                      }))}
                    />
                    <LinkedMediaList
                      label="현재 연결된 스포티파이 (유지됨)"
                      items={currentSong.spotifyTracks.map((track) => ({
                        id: track.id,
                        label: track.label,
                        url: `https://open.spotify.com/track/${track.id}`,
                      }))}
                    />
                  </div>
                )}

                <SelectedMediaList
                  label="추가할 유튜브 영상"
                  items={form.youtubeVideos.map((video) => ({
                    id: video.id,
                    label: video.title || video.id,
                    url: `https://www.youtube.com/watch?v=${video.id}`,
                  }))}
                  onRemove={(id) => {
                    const video = form.youtubeVideos.find(
                      (current) => current.id === id,
                    );
                    if (video) {
                      toggleYoutubeVideo(video);
                    }
                  }}
                />
                <SelectedMediaList
                  label="추가할 스포티파이 트랙"
                  items={form.spotifyTracks.map((track) => ({
                    id: track.id,
                    label: track.name || track.id,
                    url: `https://open.spotify.com/track/${track.id}`,
                  }))}
                  onRemove={(id) => {
                    const track = form.spotifyTracks.find(
                      (current) => current.id === id,
                    );
                    if (track) {
                      toggleSpotifyTrack(track);
                    }
                  }}
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <ThumbnailInput
                    label="thumbnailDefault"
                    value={form.thumbnailDefault}
                    onChange={(value) => updateForm("thumbnailDefault", value)}
                  />
                  <ThumbnailInput
                    label="thumbnailMedium"
                    value={form.thumbnailMedium}
                    onChange={(value) => updateForm("thumbnailMedium", value)}
                  />
                  <ThumbnailInput
                    label="thumbnailHigh"
                    value={form.thumbnailHigh}
                    onChange={(value) => updateForm("thumbnailHigh", value)}
                  />
                </div>
              </form>
            )}

            <div className="mt-6">
              <h3 className="text-base font-semibold">미디어 후보</h3>
              <p className="mt-1 text-sm text-gray-600">
                media db에서 다시 검색한 후보입니다. 카드를 눌러 추가 목록에
                넣거나 뺄 수 있습니다. 이미 연결된 미디어는 선택할 수 없습니다.
              </p>

              {isCandidatesLoading && (
                <p className="mt-3 text-gray-600">후보 불러오는 중</p>
              )}
              {candidatesError && (
                <p className="mt-3 text-red-700">{candidatesError}</p>
              )}

              {candidates && form && (
                <div className="mt-3 grid gap-5">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700">
                      유튜브 ({candidates.youtubeVideos.length})
                    </h4>
                    {candidates.youtubeVideos.length === 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        후보가 없습니다.
                      </p>
                    )}
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      {candidates.youtubeVideos.map((video) => {
                        const isLinked = linkedYoutubeIds.has(video.id);
                        const isSelected = form.youtubeVideos.some(
                          (current) => current.id === video.id,
                        );

                        return (
                          <div
                            className={`border p-3 ${
                              isLinked
                                ? "border-gray-200 bg-gray-100"
                                : isSelected
                                  ? "border-gray-900 bg-yellow-50"
                                  : "border-gray-300"
                            }`}
                            key={video.id}
                          >
                            <button
                              type="button"
                              className="flex w-full cursor-pointer gap-3 text-left disabled:cursor-not-allowed"
                              disabled={isLinked}
                              onClick={() =>
                                toggleYoutubeVideo({
                                  id: video.id,
                                  title: video.title,
                                  thumbnailMedium: video.thumbnailMedium,
                                  viewCount: video.viewCount,
                                })
                              }
                            >
                              {video.thumbnailMedium && (
                                <img
                                  alt=""
                                  className="h-16 w-28 shrink-0 border border-gray-200 object-cover"
                                  src={video.thumbnailMedium}
                                />
                              )}
                              <span>
                                <span className="block text-sm font-medium">
                                  {video.title}
                                  {isLinked && (
                                    <span className="ml-1.5 border border-gray-400 px-1 text-xs text-gray-600">
                                      연결됨
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                  조회수 {formatCount(video.viewCount)} ·{" "}
                                  {formatDate(video.publishedAt)}
                                </span>
                              </span>
                            </button>
                            <div className="mt-2 flex gap-2">
                              <MediaOpenButton
                                label="유튜브"
                                url={`https://www.youtube.com/watch?v=${video.id}`}
                              />
                              <button
                                type="button"
                                className="cursor-pointer border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700"
                                onClick={() => applyThumbnails(video)}
                              >
                                썸네일로 사용
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700">
                      스포티파이 ({candidates.spotifyTracks.length})
                    </h4>
                    {candidates.spotifyTracks.length === 0 && (
                      <p className="mt-2 text-sm text-gray-600">
                        후보가 없습니다.
                      </p>
                    )}
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                      {candidates.spotifyTracks.map((track) => {
                        const isLinked = linkedSpotifyIds.has(track.id);
                        const isSelected = form.spotifyTracks.some(
                          (current) => current.id === track.id,
                        );

                        return (
                          <div
                            className={`border p-3 ${
                              isLinked
                                ? "border-gray-200 bg-gray-100"
                                : isSelected
                                  ? "border-gray-900 bg-yellow-50"
                                  : "border-gray-300"
                            }`}
                            key={track.id}
                          >
                            <button
                              type="button"
                              className="flex w-full cursor-pointer gap-3 text-left disabled:cursor-not-allowed"
                              disabled={isLinked}
                              onClick={() =>
                                toggleSpotifyTrack({
                                  id: track.id,
                                  name: track.name,
                                  releaseDate: track.releaseDate,
                                  albumImage: track.albumImages[0] ?? null,
                                })
                              }
                            >
                              {track.albumImages[0] && (
                                <img
                                  alt=""
                                  className="h-16 w-16 shrink-0 border border-gray-200 object-cover"
                                  src={track.albumImages[0]}
                                />
                              )}
                              <span>
                                <span className="block text-sm font-medium">
                                  {track.name}
                                  {isLinked && (
                                    <span className="ml-1.5 border border-gray-400 px-1 text-xs text-gray-600">
                                      연결됨
                                    </span>
                                  )}
                                </span>
                                <span className="mt-1 block text-xs text-gray-500">
                                  {track.releaseDate ?? "-"} ·{" "}
                                  {formatDuration(track.durationMs)} · ISRC{" "}
                                  {track.isrc ?? "-"}
                                </span>
                              </span>
                            </button>
                            <div className="mt-2">
                              <MediaOpenButton
                                label="스포티파이"
                                url={`https://open.spotify.com/track/${track.id}`}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {form.spotifyTracks[0] && (
                    <iframe
                      title="Spotify track preview"
                      className="h-[152px] w-full border border-gray-300"
                      src={`https://open.spotify.com/embed/track/${form.spotifyTracks[0].id}`}
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                    />
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function TextInput({
  label,
  currentValue,
  required,
  value,
  onChange,
}: {
  label: string;
  currentValue?: string;
  required?: boolean;
  value: string;
  onChange(value: string): void;
}) {
  const isChanged = (currentValue ?? "") !== value.trim();

  return (
    <div>
      <label className="text-sm text-gray-700">
        {label}
        {required ? " *" : ""}
      </label>
      <input
        className={`mt-1 w-full border px-2 py-1.5 ${
          isChanged ? "border-amber-600" : "border-gray-300"
        }`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <p className="mt-0.5 truncate text-xs text-gray-500" title={currentValue}>
        현재: {currentValue ?? "-"}
      </p>
    </div>
  );
}

function LinkedMediaList({
  label,
  items,
}: {
  label: string;
  items: Array<{ id: string; label: string; url: string }>;
}) {
  return (
    <div>
      <span className="text-sm text-gray-700">
        {label} ({items.length})
      </span>
      {items.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">연결된 항목이 없습니다.</p>
      )}
      {items.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {items.map((item) => (
            <a
              className="inline-block max-w-full cursor-pointer truncate border border-gray-200 bg-gray-100 px-2 py-1 text-sm text-gray-700 underline"
              href={item.url}
              key={item.id}
              rel="noopener noreferrer"
              target="_blank"
              title={item.label}
            >
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function SelectedMediaList({
  label,
  items,
  onRemove,
}: {
  label: string;
  items: Array<{ id: string; label: string; url: string }>;
  onRemove(id: string): void;
}) {
  return (
    <div>
      <span className="text-sm text-gray-700">
        {label} ({items.length})
      </span>
      {items.length === 0 && (
        <p className="mt-1 text-sm text-gray-500">선택된 항목이 없습니다.</p>
      )}
      {items.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              className="inline-flex max-w-full items-center gap-1.5 border border-gray-300 px-2 py-1 text-sm"
              key={item.id}
            >
              <a
                className="cursor-pointer truncate underline"
                href={item.url}
                rel="noopener noreferrer"
                target="_blank"
                title={item.label}
              >
                {item.label}
              </a>
              <button
                type="button"
                aria-label={`${item.label} 제거`}
                className="cursor-pointer text-red-700"
                onClick={() => onRemove(item.id)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MediaOpenButton({ label, url }: { label: string; url: string }) {
  return (
    <button
      type="button"
      className="cursor-pointer border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
    >
      {label}
    </button>
  );
}

function ThumbnailInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange(value: string): void;
}) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const trimmedValue = value.trim();
  const imageFailed = failedSrc === trimmedValue;

  return (
    <div>
      <label className="text-sm text-gray-700">{label}</label>
      <input
        className="mt-1 w-full border border-gray-300 px-2 py-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {trimmedValue && !imageFailed && (
        <img
          alt={`${label} preview`}
          className="mt-2 h-32 w-full border border-gray-300 object-contain"
          src={trimmedValue}
          onError={() => setFailedSrc(trimmedValue)}
        />
      )}
      {trimmedValue && imageFailed && (
        <p className="mt-2 text-sm text-red-700">이미지 로드 실패</p>
      )}
    </div>
  );
}

async function fetchSongUpdateQueue(): Promise<SongUpdateQueueItem[]> {
  const response = await fetch("/api/song-update-queue");

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body = (await response.json()) as SongUpdateQueueListResponse;
  return body.data;
}

async function fetchMediaCandidates(
  queueId: number,
): Promise<SongMediaCandidatesResponse> {
  const response = await fetch(
    `/api/song-update-queue/${queueId}/media-candidates`,
  );

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return (await response.json()) as SongMediaCandidatesResponse;
}

async function applySongUpdate(
  queueId: number,
  form: SongForm,
): Promise<ApplySongUpdateResponse> {
  const response = await fetch(`/api/song-update-queue/${queueId}/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // apply는 미디어를 ID 배열로만 받는다 (Song 쪽은 조인 테이블 추가).
    body: JSON.stringify({
      ...form,
      youtubeVideos: undefined,
      spotifyTracks: undefined,
      youtubeVideoIds: form.youtubeVideos.map((video) => video.id),
      spotifyTrackIds: form.spotifyTracks.map((track) => track.id),
    }),
  });

  if (!response.ok) {
    throw new Error(`Apply failed: ${response.status}`);
  }

  return (await response.json()) as ApplySongUpdateResponse;
}

async function deleteSongUpdateQueueItem(queueId: number): Promise<void> {
  const response = await fetch(`/api/song-update-queue/${queueId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

function createFormFromItem(item: SongUpdateQueueItem): SongForm {
  return {
    catalog: item.currentSong?.catalog ?? "",
    title: item.title,
    titleKo: item.titleKo ?? "",
    titleJa: item.titleJa ?? "",
    titleJaKana: item.titleJaKana ?? "",
    titleJaPronu: item.titleJaPronu ?? "",
    titleJaKanji: item.titleJaKanji ?? "",
    titleLatin: item.titleLatin ?? "",
    titleLatinPronu: item.titleLatinPronu ?? "",
    // 추가할 미디어는 빈 상태로 시작한다. 후보 카드에서 골라 담는다.
    youtubeVideos: [],
    spotifyTracks: [],
    thumbnailDefault: item.thumbnailDefault ?? "",
    thumbnailMedium: item.thumbnailMedium ?? "",
    thumbnailHigh: item.thumbnailHigh ?? "",
  };
}

function toggleById<T extends { id: string }>(items: T[], item: T): T[] {
  return items.some((current) => current.id === item.id)
    ? items.filter((current) => current.id !== item.id)
    : [...items, item];
}

function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

function formatCount(value: string | null): string {
  const count = Number(value);

  if (!value || !Number.isFinite(count)) {
    return "-";
  }

  return count.toLocaleString("ko-KR");
}

function formatDuration(durationMs: number | null): string {
  if (durationMs === null) {
    return "-";
  }

  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
