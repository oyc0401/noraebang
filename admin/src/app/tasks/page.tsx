"use client";

import { useRef, useState, useTransition } from "react";

import { MAX_ARTIST } from "@/lib/admin/z-param";

import {
  runAutoFillArtistNamesForArtist,
  runAutoFillSongTitlesForArtist,
  runFetchProposeForArtist,
  runFetchSpotifyTracksForArtist,
  runFetchTopicVideosForArtist,
  runFetchNewTjSongs,
  runMapProposeSongForArtist,
  runMapSongYoutubeVideoForArtist,
  runMapSongYoutubeVideoFromSearchForArtist,
  runUpdateSongThumbnailsForArtist,
  runMapSongSpotifyGroupsForArtist,
  runUpdateSongScoreForArtist,
  runUpdateArtistThumbnailsForArtist,
} from "./actions";

type TaskAction = (
  artistId: number,
  options: { dryRun: boolean },
) => Promise<void>;

type RangeParams = {
  startId: string;
  endId: string;
};

function useGlobalTask(
  taskName: string,
  action: (options: { dryRun: boolean }) => Promise<void>,
  defaultDryRun = true,
) {
  const [dryRun, setDryRun] = useState(defaultDryRun);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () => {
    startTransition(() => {
      setError(null);
      setSummary(`실행 중... (${dryRun ? "dry-run" : "실제"})`);

      (async () => {
        try {
          await action({ dryRun });
          console.log(`[${taskName}] 완료`);
          setSummary("완료");
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : "알 수 없는 오류가 발생했습니다.";
          setError(message);
          setSummary("실패");
          console.error(`[${taskName}] 실패: ${message}`);
        }
      })();
    });
  };

  return {
    dryRun,
    setDryRun,
    summary,
    error,
    pending,
    run,
  };
}

function useArtistTask(
  taskName: string,
  action: TaskAction,
  getRange: () => RangeParams,
  defaultDryRun = true,
) {
  const [dryRun, setDryRun] = useState(defaultDryRun);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const cancelRef = useRef(false);

  const run = () => {
    const { startId, endId } = getRange();
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
  // 공용 범위 상태
  const [startId, setStartId] = useState("1");
  const [endId, setEndId] = useState(String(MAX_ARTIST));
  const [singleMode, setSingleMode] = useState(false);

  const getRange = () => ({ startId, endId });

  const mapTask = useArtistTask(
    "mapProposeSong",
    runMapProposeSongForArtist,
    getRange,
  );
  const songTask = useArtistTask(
    "autoFillSongTitles",
    runAutoFillSongTitlesForArtist,
    getRange,
    false,
  );
  const artistTask = useArtistTask(
    "autoFillArtistNames",
    runAutoFillArtistNamesForArtist,
    getRange,
    false,
  );
  const youtubeTask = useArtistTask(
    "mapSongYoutubeVideo",
    runMapSongYoutubeVideoForArtist,
    getRange,
  );
  const youtubeSearchTask = useArtistTask(
    "mapSongYoutubeVideoFromSearch",
    runMapSongYoutubeVideoFromSearchForArtist,
    getRange,
  );
  const spotifyTask = useArtistTask(
    "mapSongSpotifyGroups",
    runMapSongSpotifyGroupsForArtist,
    getRange,
  );
  const thumbTask = useArtistTask(
    "updateSongThumbnails",
    runUpdateSongThumbnailsForArtist,
    getRange,
    false,
  );
  const scoreTask = useArtistTask(
    "updateSongScore",
    runUpdateSongScoreForArtist,
    getRange,
    false,
  );
  const fetchProposeTask = useArtistTask(
    "fetchProposeForArtist",
    runFetchProposeForArtist,
    getRange,
  );
  const fetchSpotifyTracksTask = useArtistTask(
    "fetchSpotifyTracksForArtist",
    runFetchSpotifyTracksForArtist,
    getRange,
  );
  const fetchTopicVideosTask = useArtistTask(
    "fetchTopicVideosForArtist",
    runFetchTopicVideosForArtist,
    getRange,
  );
  const artistThumbTask = useArtistTask(
    "updateArtistThumbnails",
    runUpdateArtistThumbnailsForArtist,
    getRange,
    false,
  );

  // 전역 작업 (아티스트 범위 무관)
  const fetchNewTjSongsTask = useGlobalTask(
    "fetchNewTjSongs",
    runFetchNewTjSongs,
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

        {/* 공용 범위 입력 */}
        <section className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold text-blue-700">
              아티스트 ID 범위
            </span>
            <div className="flex items-center gap-3">
              <RangeInput
                label={singleMode ? "ID" : "시작 ID"}
                value={startId}
                onChange={(val) => {
                  setStartId(val);
                  if (singleMode) setEndId(val);
                }}
              />
              {!singleMode && (
                <RangeInput label="종료 ID" value={endId} onChange={setEndId} />
              )}
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 text-sm font-semibold text-zinc-700">
                <input
                  type="checkbox"
                  checked={singleMode}
                  onChange={(e) => {
                    setSingleMode(e.target.checked);
                    if (e.target.checked) setEndId(startId);
                  }}
                  className="h-4 w-4 rounded border-zinc-300 text-blue-500 focus:ring-blue-400"
                />
                단일
              </label>
            </div>
          </div>
        </section>

        {/* 2분할 레이아웃 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 왼쪽: 데이터 수집 */}
          <div className="space-y-4">
            {/* new-song-detection 그룹 (전역) */}
            <GroupHeader
              title="신곡 감지"
              color="green"
              description="new-song-detection"
            />
            <GlobalTaskCard
              title="TJ 최신곡 수집 + Song 연결"
              description="fetchNewTjSongs: 현재 월 TJ 최신곡을 가져와 TjSong에 저장하고, 아티스트 매칭 후 Song.tjSongId를 연결합니다."
              task={fetchNewTjSongsTask}
            />

            {/* refresh 그룹 */}
            <GroupHeader
              title="데이터 새로고침"
              color="purple"
              description="refresh"
            />
            <TaskCard
              title="TJ 신청곡 수집"
              description="fetchProposeForArtist: 아티스트의 tjName으로 TJ 신청곡을 검색하여 DB에 저장합니다."
              task={fetchProposeTask}
            />
            <TaskCard
              title="Spotify 트랙 수집"
              description="fetchSpotifyTracksForArtist: 아티스트의 spotifyId로 모든 앨범/트랙을 가져와 SpotifyTrack에 저장합니다."
              task={fetchSpotifyTracksTask}
            />
            <TaskCard
              title="YouTube Topic 비디오 수집"
              description="fetchTopicVideosForArtist: 아티스트의 Topic 채널에서 모든 비디오를 가져와 YoutubeVideo에 저장합니다."
              task={fetchTopicVideosTask}
            />
          </div>

          {/* 오른쪽: 매핑 + 자동채우기 */}
          <div className="space-y-4">
            {/* mapping 그룹 */}
            <GroupHeader
              title="매핑"
              color="orange"
              description="mapping"
            />
            <TaskCard
              title="TJ 신청곡 → 곡 매핑"
              description="mapProposeSong: 지정 구간의 신청곡을 자동 매핑합니다."
              task={mapTask}
            />
            <TaskCard
              title="곡 ↔ YouTube 토픽 매핑"
              description="토픽 채널 영상과 곡을 비교해 SongYoutubeVideo를 자동으로 채웁니다."
              task={youtubeTask}
            />
            <TaskCard
              title="검색 결과 기반 YouTube 매핑"
              description="searchUnlinkedSongYoutube 결과를 활용해 곡과 토픽 채널 영상을 연결합니다."
              task={youtubeSearchTask}
            />
            <TaskCard
              title="곡 ↔ Spotify 그룹 매핑"
              description="findBestMatch로 곡과 SpotifyTrackGroup을 자동 매핑합니다."
              task={spotifyTask}
            />

            {/* auto-fill 그룹 */}
            <GroupHeader
              title="자동 채우기"
              color="cyan"
              description="auto-fill"
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
              title="아티스트 썸네일 자동 채우기"
              description="1순위 Spotify, 2순위 YouTube Topic, 3순위 YouTube Main 채널에서 썸네일을 가져옵니다."
              task={artistThumbTask}
            />
            <TaskCard
              title="곡 썸네일 보정"
              description="Spotify/YouTube 정보를 바탕으로 곡 썸네일을 자동으로 채웁니다."
              task={thumbTask}
            />
            <TaskCard
              title="곡 점수 산출"
              description="Spotify 인기, TJ 여부, YouTube 조회수를 조합해 score 컬럼을 계산합니다."
              task={scoreTask}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

type ArtistTask = ReturnType<typeof useArtistTask>;
type GlobalTask = ReturnType<typeof useGlobalTask>;

function GlobalTaskCard({
  title,
  description,
  task,
}: {
  title: string;
  description: string;
  task: GlobalTask;
}) {
  return (
    <section className="rounded-xl border border-green-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="md:w-1/3">
          <h2 className="text-base font-bold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <DryRunToggle checked={task.dryRun} onChange={task.setDryRun} />
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <button
            type="button"
            onClick={task.run}
            disabled={task.pending}
            className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {task.pending ? "실행 중..." : "실행"}
          </button>
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
        <div className="md:w-1/3">
          <h2 className="text-base font-bold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <div className="flex items-center gap-3">
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

function DryRunToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-semibold text-zinc-700">
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

const groupColors = {
  green: "border-green-300 bg-green-50 text-green-700",
  purple: "border-purple-300 bg-purple-50 text-purple-700",
  orange: "border-orange-300 bg-orange-50 text-orange-700",
  cyan: "border-cyan-300 bg-cyan-50 text-cyan-700",
} as const;

function GroupHeader({
  title,
  color,
  description,
}: {
  title: string;
  color: keyof typeof groupColors;
  description: string;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${groupColors[color]}`}>
      <span className="text-sm font-bold">{title}</span>
      <span className="ml-2 text-xs opacity-70">({description})</span>
    </div>
  );
}
