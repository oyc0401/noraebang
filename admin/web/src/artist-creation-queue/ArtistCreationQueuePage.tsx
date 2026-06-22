import { type ReactNode, useEffect, useState } from "react";

type ArtistCreationQueueItem = {
  id: number;
  tjSongId?: string;
  homeCatalog?: string;
  name: string;
  nameKo: string;
  nameJa?: string;
  nameJaKana?: string;
  nameJaPronu?: string;
  nameLatin?: string;
  nameLatinPronu?: string;
  tjName?: string;
  slug?: string;
  youtubeChannel?: string;
  youtubeTopicChannel?: string;
  spotifyId?: string;
  thumbnailDefault?: string;
  thumbnailMedium?: string;
  thumbnailHigh?: string;
  createdAt: string;
  updatedAt: string;
};

type ArtistCreationQueueListResponse = {
  data: ArtistCreationQueueItem[];
};

type CreateArtistResponse = {
  artistId: number;
};

type ArtistForm = {
  homeCatalog: string;
  name: string;
  nameKo: string;
  nameJa: string;
  nameJaKana: string;
  nameJaPronu: string;
  nameLatin: string;
  nameLatinPronu: string;
  tjName: string;
  slug: string;
  youtubeChannel: string;
  youtubeTopicChannel: string;
  spotifyId: string;
  thumbnailDefault: string;
  thumbnailMedium: string;
  thumbnailHigh: string;
};

export function ArtistCreationQueuePage() {
  const [items, setItems] = useState<ArtistCreationQueueItem[]>();
  const [selectedId, setSelectedId] = useState<number>();
  const [form, setForm] = useState<ArtistForm>();
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState<string>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadItems() {
      try {
        const result = await fetchArtistCreationQueue();
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

  function selectItem(item: ArtistCreationQueueItem) {
    setSelectedId(item.id);
    setForm(createFormFromItem(item));
    setMessage(undefined);
    setError(undefined);
  }

  function updateForm<K extends keyof ArtistForm>(
    key: K,
    value: ArtistForm[K],
  ) {
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

  async function deleteSelectedItem(item: ArtistCreationQueueItem) {
    const confirmed = window.confirm(
      `${item.name} 큐 항목을 삭제할까요? 이 동작은 artist_creation_queue에서만 삭제합니다.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteArtistCreationQueueItem(item.id);
      removeItemFromPage(item.id);
      setMessage("큐 항목을 삭제했습니다.");
      setError(undefined);
    } catch (deleteError) {
      setError(String(deleteError));
      setMessage(undefined);
    }
  }

  async function createArtist() {
    if (!selectedItem || !form) {
      return;
    }

    const confirmed = window.confirm(
      `${form.name} 가수를 생성하고, song_artist_queue에 연결한 뒤 가수생성큐에서 삭제할까요?`,
    );

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createArtistFromQueue(selectedItem.id, form);
      await deleteArtistCreationQueueItem(selectedItem.id);
      removeItemFromPage(selectedItem.id);
      setMessage(`가수를 생성했습니다. artistId=${result.artistId}`);
      setError(undefined);
    } catch (createError) {
      setError(String(createError));
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
        setSelectedId(nextSelectedItem?.id);
        setForm(
          nextSelectedItem ? createFormFromItem(nextSelectedItem) : undefined,
        );
      }

      return nextItems;
    });
  }

  return (
    <main className="max-w-7xl p-6 text-gray-950">
      <a
        className="cursor-pointer text-sm text-gray-600 underline"
        href="/admin"
      >
        Admin
      </a>
      <h1 className="mt-3 text-2xl font-semibold">가수생성큐 상태</h1>
      <p className="mt-2 text-gray-600">
        artist_creation_queue 항목을 보고, 폼 값으로 새 가수를 생성합니다.
      </p>

      {error && <p className="mt-4 text-red-700">{error}</p>}
      {message && <p className="mt-4 text-green-700">{message}</p>}

      {!error && !items && <p className="mt-4 text-gray-600">불러오는 중</p>}

      {!error && items && items.length === 0 && (
        <p className="mt-4 text-gray-600">큐 항목이 없습니다.</p>
      )}

      {items && items.length > 0 && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[420px_1fr]">
          <section aria-labelledby="artist-creation-queue-list-heading">
            <h2
              id="artist-creation-queue-list-heading"
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
                      <span className="block font-medium">{item.name}</span>
                      <span className="mt-1 block text-sm text-gray-700">
                        {item.nameKo} / TJ {item.tjSongId ?? "-"}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        TJ 이름: {item.tjName ?? "-"} ·{" "}
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

          <section aria-labelledby="artist-creation-form-heading">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="artist-creation-form-heading"
                className="text-lg font-semibold"
              >
                가수 생성 폼
              </h2>
              <button
                type="button"
                className="cursor-pointer border border-gray-900 px-3 py-1.5 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400"
                disabled={!selectedItem || !form || isSubmitting}
                onClick={createArtist}
              >
                {isSubmitting ? "생성 중" : "가수 생성"}
              </button>
            </div>

            {selectedItem && form && (
              <form
                className="mt-3 grid gap-4"
                onSubmit={(event) => event.preventDefault()}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <TextInput
                    label="homeCatalog"
                    value={form.homeCatalog}
                    onChange={(value) => updateForm("homeCatalog", value)}
                  />
                  <TextInput
                    label="name"
                    required
                    value={form.name}
                    onChange={(value) => updateForm("name", value)}
                  />
                  <TextInput
                    label="nameKo"
                    required
                    value={form.nameKo}
                    onChange={(value) => updateForm("nameKo", value)}
                  />
                  <TextInput
                    label="nameJa"
                    value={form.nameJa}
                    onChange={(value) => updateForm("nameJa", value)}
                  />
                  <TextInput
                    label="nameJaKana"
                    value={form.nameJaKana}
                    onChange={(value) => updateForm("nameJaKana", value)}
                  />
                  <TextInput
                    label="nameJaPronu"
                    value={form.nameJaPronu}
                    onChange={(value) => updateForm("nameJaPronu", value)}
                  />
                  <TextInput
                    label="nameLatin"
                    value={form.nameLatin}
                    onChange={(value) => updateForm("nameLatin", value)}
                  />
                  <TextInput
                    label="nameLatinPronu"
                    value={form.nameLatinPronu}
                    onChange={(value) => updateForm("nameLatinPronu", value)}
                  />
                  <TextInput
                    label="tjName"
                    value={form.tjName}
                    onChange={(value) => updateForm("tjName", value)}
                  />
                  <TextInput
                    label="slug"
                    value={form.slug}
                    onChange={(value) => updateForm("slug", value)}
                  />
                  <TextInput
                    label="youtubeChannel"
                    value={form.youtubeChannel}
                    onChange={(value) => updateForm("youtubeChannel", value)}
                    labelAction={
                      <ChannelOpenButton
                        label="유튜브"
                        value={form.youtubeChannel}
                        baseUrl="https://www.youtube.com/channel/"
                      />
                    }
                  />
                  <TextInput
                    label="youtubeTopicChannel"
                    value={form.youtubeTopicChannel}
                    onChange={(value) =>
                      updateForm("youtubeTopicChannel", value)
                    }
                    labelAction={
                      <ChannelOpenButton
                        label="유튜브뮤직"
                        value={form.youtubeTopicChannel}
                        baseUrl="https://music.youtube.com/channel/"
                      />
                    }
                  />
                  <TextInput
                    label="spotifyId"
                    value={form.spotifyId}
                    onChange={(value) => updateForm("spotifyId", value)}
                    labelAction={
                      <ChannelOpenButton
                        label="스포티파이"
                        value={form.spotifyId}
                        baseUrl="https://open.spotify.com/artist/"
                      />
                    }
                  />
                  <SpotifyPreview value={form.spotifyId} />
                </div>

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
          </section>
        </div>
      )}
    </main>
  );
}

function TextInput({
  label,
  labelAction,
  required,
  value,
  onChange,
}: {
  label: string;
  labelAction?: ReactNode;
  required?: boolean;
  value: string;
  onChange(value: string): void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-700">
          {label}
          {required ? " *" : ""}
        </label>
        {labelAction}
      </div>
      <input
        className="mt-1 w-full border border-gray-300 px-2 py-1.5"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ChannelOpenButton({
  label,
  value,
  baseUrl,
}: {
  label: string;
  value: string;
  baseUrl: string;
}) {
  const url = createChannelUrl(value, baseUrl);

  return (
    <button
      type="button"
      className="cursor-pointer border border-gray-300 px-1.5 py-0.5 text-xs text-gray-700 disabled:cursor-not-allowed disabled:text-gray-400"
      disabled={!url}
      onClick={() => {
        if (url) {
          window.open(url, "_blank", "noopener,noreferrer");
        }
      }}
    >
      {label}
    </button>
  );
}

function SpotifyPreview({ value }: { value: string }) {
  const embedUrl = createSpotifyEmbedUrl(value);

  if (!embedUrl) {
    return null;
  }

  return (
    <iframe
      title="Spotify artist preview"
      className="h-[152px] w-full border border-gray-300"
      src={embedUrl}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
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
      <TextInput label={label} value={value} onChange={onChange} />
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

async function fetchArtistCreationQueue(): Promise<ArtistCreationQueueItem[]> {
  const response = await fetch("/api/artist-creation-queue");

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  const body = (await response.json()) as ArtistCreationQueueListResponse;
  return body.data;
}

async function createArtistFromQueue(
  queueId: number,
  form: ArtistForm,
): Promise<CreateArtistResponse> {
  const response = await fetch(
    `/api/artist-creation-queue/${queueId}/create-artist`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    },
  );

  if (!response.ok) {
    throw new Error(`Create failed: ${response.status}`);
  }

  return (await response.json()) as CreateArtistResponse;
}

async function deleteArtistCreationQueueItem(queueId: number): Promise<void> {
  const response = await fetch(`/api/artist-creation-queue/${queueId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

function createFormFromItem(item: ArtistCreationQueueItem): ArtistForm {
  return {
    homeCatalog: item.homeCatalog ?? "",
    name: item.name,
    nameKo: item.nameKo,
    nameJa: item.nameJa ?? "",
    nameJaKana: item.nameJaKana ?? "",
    nameJaPronu: item.nameJaPronu ?? "",
    nameLatin: item.nameLatin ?? "",
    nameLatinPronu: item.nameLatinPronu ?? "",
    tjName: item.tjName ?? "",
    slug: item.slug ?? "",
    youtubeChannel: item.youtubeChannel ?? "",
    youtubeTopicChannel: item.youtubeTopicChannel ?? "",
    spotifyId: item.spotifyId ?? "",
    thumbnailDefault: item.thumbnailDefault ?? "",
    thumbnailMedium: item.thumbnailMedium ?? "",
    thumbnailHigh: item.thumbnailHigh ?? "",
  };
}

function formatCreatedAt(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

function createChannelUrl(value: string, baseUrl: string): string | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  if (/^https?:\/\//.test(trimmedValue)) {
    return trimmedValue;
  }

  return `${baseUrl}${trimmedValue.replace(/^\/+/, "")}`;
}

function createSpotifyEmbedUrl(value: string): string | undefined {
  const artistId = extractSpotifyArtistId(value);

  if (!artistId) {
    return undefined;
  }

  return `https://open.spotify.com/embed/artist/${artistId}`;
}

function extractSpotifyArtistId(value: string): string | undefined {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return undefined;
  }

  const artistPathMatch = trimmedValue.match(
    /open\.spotify\.com\/(?:embed\/)?artist\/([^/?#]+)/,
  );

  if (artistPathMatch?.[1]) {
    return artistPathMatch[1];
  }

  if (/^[A-Za-z0-9]+$/.test(trimmedValue)) {
    return trimmedValue;
  }

  return undefined;
}
