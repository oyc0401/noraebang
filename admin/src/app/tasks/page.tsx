"use client";

import { useRef, useState, useTransition } from "react";

import { MAX_ARTIST } from "@/lib/admin/z-param";

import {
  runAutoFillArtistNamesForArtist,
  runAutoFillSongTitlesForArtist,
  runMapProposeSongForArtist,
  runMapSongYoutubeVideoForArtist,
  runUpdateSongThumbnailsForArtist,
  runMapSongSpotifyGroupsForArtist,
} from "./actions";

type TaskAction = (
  artistId: number,
  options: { dryRun: boolean },
) => Promise<void>;

function useArtistTask(
  taskName: string,
  action: TaskAction,
  defaultDryRun = true,
) {
  const [startId, setStartId] = useState("1");
  const [endId, setEndId] = useState(String(MAX_ARTIST));
  const [dryRun, setDryRun] = useState(defaultDryRun);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef(false);

  const run = () => {
    const start = Number(startId);
    const end = Number(endId);
    if (!Number.isFinite(start) || !Number.isFinite(end) || start <= 0) {
      setError("유효한 ID 범위를 입력하세요.");
      return;
    }
    if (start > end) {
      setError("시작 ID가 종료 ID보다 큽니다.");
      return;
    }

    startTransition(() => {
      setError(null);
      setSummary(
        `실행 시작 (ID ${start}~${end}, ${dryRun ? "dry-run" : "실제"})`,
      );
      cancelRef.current = false;
      const total = end - start + 1;

      (async () => {
        let success = 0;
        let cancelled = false;
        for (let artistId = start; artistId <= end; artistId++) {
          if (cancelRef.current) {
            cancelled = true;
            break;
          }
          setSummary(
            `Artist #${artistId} 처리 중... (${artistId - start + 1}/${total})`,
          );
          try {
            await action(artistId, { dryRun });
            console.log(`[${taskName}] Artist #${artistId} 완료`);
            success += 1;
          } catch (err) {
            const message =
              err instanceof Error
                ? err.message
                : "알 수 없는 오류가 발생했습니다.";
            setError(message);
            console.error(`[${taskName}] Artist #${artistId} 실패: ${message}`);
          }
        }
        setSummary(
          cancelled
            ? `사용자 중단 (${success}/${total}명 처리)`
            : `${success}명 처리 완료`,
        );
      })();
    });
  };

  const cancel = () => {
    if (!pending) return;
    cancelRef.current = true;
    setSummary("중단 요청 중...");
  };

  return {
    startId,
    setStartId,
    endId,
    setEndId,
    dryRun,
    setDryRun,
    summary,
    error,
    pending,
    run,
    cancel,
  };
}

export default function AdminTasksPage() {
  const mapTask = useArtistTask(
    "mapProposeSong",
    runMapProposeSongForArtist,
    false,
  );
  const songTask = useArtistTask(
    "autoFillSongTitles",
    runAutoFillSongTitlesForArtist,
  );
  const artistTask = useArtistTask(
    "autoFillArtistNames",
    runAutoFillArtistNamesForArtist,
  );
  const youtubeTask = useArtistTask(
    "mapSongYoutubeVideo",
    runMapSongYoutubeVideoForArtist,
  );
  const spotifyTask = useArtistTask(
    "mapSongSpotifyGroups",
    runMapSongSpotifyGroupsForArtist,
  );
  const thumbTask = useArtistTask(
    "updateSongThumbnails",
    runUpdateSongThumbnailsForArtist,
  );

  return (
    <div className="min-h-screen bg-zinc-50 py-4">
      <div className="w-full px-2 sm:px-3">
        <header className="mb-6 border-b border-zinc-200 pb-4">
          <p className="text-sm font-semibold text-blue-600">Admin Ops</p>
          <h1 className="text-3xl font-bold text-zinc-900">자동화 작업 실행</h1>
          <p className="mt-2 text-sm text-zinc-600">
            CLI 대신 어드민에서 직접 작업을 수행하세요. 진행 상황은 콘솔과 카드
            상태에서 확인할 수 있으며, 긴 작업은 중단 버튼으로 즉시 취소할 수
            있습니다.
          </p>
        </header>

        <div className="space-y-4">
          <TaskCard
            title="TJ 신청곡 → 곡 매핑"
            description="mapProposeSong: 지정 구간의 신청곡을 자동 매핑합니다."
            task={mapTask}
          />

          <TaskCard
            title="곡 제목 자동 채우기"
            description="Spotify/곡 제목 정보를 활용해 titleLatin/titleJa* 필드를 보완합니다."
            task={songTask}
          />

          <TaskCard
            title="아티스트 이름 자동 채우기"
            description="Spotify/토픽 채널 이름을 활용해 nameLatin/nameJa* 필드를 보완합니다."
            task={artistTask}
          />

          <TaskCard
            title="곡 ↔ YouTube 토픽 매핑"
            description="토픽 채널 영상과 곡을 비교해 SongYoutubeVideo를 자동으로 채웁니다."
            task={youtubeTask}
          />

          <TaskCard
            title="곡 ↔ Spotify 그룹 매핑"
            description="findBestMatch로 곡과 SpotifyTrackGroup을 자동 매핑합니다."
            task={spotifyTask}
          />

          <TaskCard
            title="곡 썸네일 보정"
            description="Spotify/YouTube 정보를 바탕으로 곡 썸네일을 자동으로 채웁니다."
            task={thumbTask}
          />
        </div>
      </div>
    </div>
  );
}

type ArtistTask = ReturnType<typeof useArtistTask>;

function TaskCard({
  title,
  description,
  task,
}: {
  title: string;
  description: string;
  task: ArtistTask;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="md:w-1/4">
          <h2 className="text-base font-bold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <div className="flex flex-1 flex-nowrap items-center gap-3 overflow-x-auto">
          <RangeInputs
            startValue={task.startId}
            endValue={task.endId}
            onStartChange={task.setStartId}
            onEndChange={task.setEndId}
          />
          <DryRunToggle checked={task.dryRun} onChange={task.setDryRun} />
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={task.run}
              disabled={task.pending}
              className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {task.pending ? "실행 중..." : "실행"}
            </button>
            {task.pending && (
              <button
                type="button"
                onClick={task.cancel}
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
              >
                중단
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-zinc-500">
            {task.summary ?? "미실행"}
          </p>
          {task.error && (
            <p className="text-center text-xs font-semibold text-red-600">
              {task.error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function RangeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex w-36 flex-col">
      <label className="text-[11px] font-semibold text-zinc-500">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
        min={1}
      />
    </div>
  );
}

function RangeInputs({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  startLabel = "시작 ID",
  endLabel = "종료 ID",
}: {
  startValue: string;
  endValue: string;
  onStartChange: (val: string) => void;
  onEndChange: (val: string) => void;
  startLabel?: string;
  endLabel?: string;
}) {
  const [singleMode, setSingleMode] = useState(false);

  return (
    <>
      <RangeInput
        label={singleMode ? "ID" : startLabel}
        value={startValue}
        onChange={(val) => {
          onStartChange(val);
          if (singleMode) onEndChange(val);
        }}
      />
      {!singleMode && (
        <RangeInput label={endLabel} value={endValue} onChange={onEndChange} />
      )}
      <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-700">
        <input
          type="checkbox"
          checked={singleMode}
          onChange={(e) => {
            setSingleMode(e.target.checked);
            if (e.target.checked) onEndChange(startValue);
          }}
          className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-400"
        />
        단일
      </label>
    </>
  );
}

function DryRunToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-400"
      />
      Dry-run
    </label>
  );
}
