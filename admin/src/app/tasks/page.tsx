"use client";

import type { ReactNode } from "react";
import { useRef, useState, useTransition } from "react";

import { MAX_ARTIST } from "@/lib/admin/z-param";

import {
  runAutoFillArtistNamesJob,
  runAutoFillSongTitlesJob,
  runMapProposeSongForArtist,
  runMapSongYoutubeVideoForArtist,
} from "./actions";

export default function AdminTasksPage() {
  const [mapStartId, setMapStartId] = useState("1");
  const [mapEndId, setMapEndId] = useState(String(MAX_ARTIST));
  const [mapDryRun, setMapDryRun] = useState(false);
  const [mapSummary, setMapSummary] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapPending, startMapTransition] = useTransition();

  const [songStartId, setSongStartId] = useState("1");
  const [songEndId, setSongEndId] = useState(String(MAX_ARTIST));
  const [songDryRun, setSongDryRun] = useState(true);
  const [songSummary, setSongSummary] = useState<string | null>(null);
  const [songError, setSongError] = useState<string | null>(null);
  const [songPending, startSongTransition] = useTransition();

  const [artistStartId, setArtistStartId] = useState("1");
  const [artistEndId, setArtistEndId] = useState(String(MAX_ARTIST));
  const [artistDryRun, setArtistDryRun] = useState(true);
  const [artistSummary, setArtistSummary] = useState<string | null>(null);
  const [artistError, setArtistError] = useState<string | null>(null);
  const [artistPending, startArtistTransition] = useTransition();

  const [youtubeStartId, setYoutubeStartId] = useState("1");
  const [youtubeEndId, setYoutubeEndId] = useState(String(MAX_ARTIST));
  const [youtubeDryRun, setYoutubeDryRun] = useState(true);
  const [youtubeSummary, setYoutubeSummary] = useState<string | null>(null);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
  const [youtubePending, startYoutubeTransition] = useTransition();

  const mapCancelRef = useRef(false);
  const youtubeCancelRef = useRef(false);

  const runMapTask = () => {
    const startId = Number(mapStartId);
    const endId = Number(mapEndId);
    if (!Number.isFinite(startId) || !Number.isFinite(endId) || startId <= 0) {
      setMapError("유효한 ID 범위를 입력하세요.");
      return;
    }
    if (startId > endId) {
      setMapError("시작 ID가 종료 ID보다 큽니다.");
      return;
    }

    startMapTransition(() => {
      setMapError(null);
      setMapSummary(
        `실행 시작 (ID ${startId}~${endId}, ${mapDryRun ? "dry-run" : "실제"})`,
      );
      mapCancelRef.current = false;
      const total = endId - startId + 1;

      (async () => {
        let success = 0;
        let cancelled = false;
        for (let artistId = startId; artistId <= endId; artistId++) {
          if (mapCancelRef.current) {
            cancelled = true;
            break;
          }
          setMapSummary(
            `Artist #${artistId} 처리 중... (${artistId - startId + 1}/${total})`,
          );
          try {
            const result = await runMapProposeSongForArtist(artistId, {
              dryRun: mapDryRun,
            });
            console.log(
              `[mapProposeSong] Artist #${artistId} matched ${result.stats.matched}, updated ${result.stats.updated}`,
            );
            success += 1;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "알 수 없는 오류가 발생했습니다.";
            setMapError(message);
            console.error(`[mapProposeSong] Artist #${artistId} 실패: ${message}`);
          }
        }
        setMapSummary(
          cancelled
            ? `사용자 중단 (${success}/${total}명 처리)`
            : `${success}명 처리 완료`,
        );
      })();
    });
  };

  const cancelMapTask = () => {
    if (!mapPending) return;
    mapCancelRef.current = true;
    setMapSummary("중단 요청 중...");
  };

  const runSongFillTask = () => {
    const startId = Number(songStartId);
    const endId = Number(songEndId);
    if (!Number.isFinite(startId) || !Number.isFinite(endId) || startId <= 0) {
      setSongError("유효한 ID 범위를 입력하세요.");
      return;
    }
    if (startId > endId) {
      setSongError("시작 ID가 종료 ID보다 큽니다.");
      return;
    }
    startSongTransition(() => {
      setSongError(null);
      setSongSummary(null);
      console.log(
        `[autoFillSongTitles] 실행 시작 (ID ${startId}~${endId}, ${songDryRun ? "dry-run" : "실제"})`,
      );

      (async () => {
        try {
          const result = await runAutoFillSongTitlesJob({
            startId,
            endId,
            dryRun: songDryRun,
          });
          const summary = `총 ${result.totalSongs}곡 중 ${result.updatedSongs}곡 업데이트`;
          setSongSummary(summary);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다.";
          setSongError(message);
          console.error(`[autoFillSongTitles] 실패: ${message}`);
        }
      })();
    });
  };

  const runArtistFillTask = () => {
    const startId = Number(artistStartId);
    const endId = Number(artistEndId);
    if (!Number.isFinite(startId) || !Number.isFinite(endId) || startId <= 0) {
      setArtistError("유효한 ID 범위를 입력하세요.");
      return;
    }
    if (startId > endId) {
      setArtistError("시작 ID가 종료 ID보다 큽니다.");
      return;
    }
    startArtistTransition(() => {
      setArtistError(null);
      setArtistSummary(null);
      console.log(
        `[autoFillArtistNames] 실행 시작 (ID ${startId}~${endId}, ${artistDryRun ? "dry-run" : "실제"})`,
      );

      (async () => {
        try {
          const result = await runAutoFillArtistNamesJob({
            startId,
            endId,
            dryRun: artistDryRun,
          });
          const summary = `총 ${result.totalArtists}명 중 ${result.updatedArtists}명 업데이트`;
          setArtistSummary(summary);
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "알 수 없는 오류가 발생했습니다.";
          setArtistError(message);
          console.error(`[autoFillArtistNames] 실패: ${message}`);
        }
      })();
    });
  };

  const runYoutubeTask = () => {
    const startId = Number(youtubeStartId);
    const endId = Number(youtubeEndId);
    if (!Number.isFinite(startId) || !Number.isFinite(endId) || startId <= 0) {
      setYoutubeError("유효한 ID 범위를 입력하세요.");
      return;
    }
    if (startId > endId) {
      setYoutubeError("시작 ID가 종료 ID보다 큽니다.");
      return;
    }

    startYoutubeTransition(() => {
      setYoutubeError(null);
      setYoutubeSummary(
        `실행 시작 (ID ${startId}~${endId}, ${youtubeDryRun ? "dry-run" : "실제"})`,
      );
      youtubeCancelRef.current = false;
      const total = endId - startId + 1;

      (async () => {
        let success = 0;
        let cancelled = false;
        for (let artistId = startId; artistId <= endId; artistId++) {
          if (youtubeCancelRef.current) {
            cancelled = true;
            break;
          }
          setYoutubeSummary(
            `Artist #${artistId} 처리 중... (${artistId - startId + 1}/${total})`,
          );
          try {
            const result = await runMapSongYoutubeVideoForArtist(artistId, {
              dryRun: youtubeDryRun,
            });
            console.log(
              `[mapSongYoutubeVideo] Artist #${artistId} matches ${result.stats.songsWithMatches}, inserted ${result.stats.inserted}`,
            );
            success += 1;
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "알 수 없는 오류가 발생했습니다.";
            setYoutubeError(message);
            console.error(`[mapSongYoutubeVideo] Artist #${artistId} 실패: ${message}`);
          }
        }
        setYoutubeSummary(
          cancelled
            ? `사용자 중단 (${success}/${total}명 처리)`
            : `${success}명 처리 완료`,
        );
      })();
    });
  };

  const cancelYoutubeTask = () => {
    if (!youtubePending) return;
    youtubeCancelRef.current = true;
    setYoutubeSummary("중단 요청 중...");
  };

  return (
    <div className="min-h-screen bg-zinc-50 py-4">
      <div className="w-full px-2 sm:px-3">
        <header className="mb-6 border-b border-zinc-200 pb-4">
          <p className="text-sm font-semibold text-blue-600">Admin Ops</p>
          <h1 className="text-3xl font-bold text-zinc-900">자동화 작업 실행</h1>
          <p className="mt-2 text-sm text-zinc-600">
            CLI 대신 어드민에서 직접 작업을 수행하세요. 진행 상황은 콘솔과 카드 상태에서 확인할 수 있으며, 긴 작업은 중단 버튼으로 즉시 취소할 수 있습니다.
          </p>
        </header>

        <div className="space-y-4">
          <TaskCard
            title="TJ 신청곡 → 곡 매핑"
            description="mapProposeSong: 지정 구간의 신청곡을 자동 매핑합니다."
            status={mapSummary}
            error={mapError}
            controls={
              <>
                <RangeInput
                  label="시작 ID"
                  value={mapStartId}
                  onChange={setMapStartId}
                />
                <RangeInput
                  label="종료 ID"
                  value={mapEndId}
                  onChange={setMapEndId}
                />
                <DryRunToggle checked={mapDryRun} onChange={setMapDryRun} />
              </>
            }
            onRun={runMapTask}
            running={mapPending}
            onCancel={cancelMapTask}
          />

          <TaskCard
            title="곡 제목 자동 채우기"
            description="Spotify/곡 제목 정보를 활용해 titleLatin/titleJa* 필드를 보완합니다."
            status={songSummary}
            error={songError}
            controls={
              <>
                <RangeInput
                  label="시작 ID"
                  value={songStartId}
                  onChange={setSongStartId}
                />
                <RangeInput
                  label="종료 ID"
                  value={songEndId}
                  onChange={setSongEndId}
                />
                <DryRunToggle
                  checked={songDryRun}
                  onChange={setSongDryRun}
                />
              </>
            }
            onRun={runSongFillTask}
            running={songPending}
          />

          <TaskCard
            title="아티스트 이름 자동 채우기"
            description="Spotify/토픽 채널 이름을 활용해 nameLatin/nameJa* 필드를 보완합니다."
            status={artistSummary}
            error={artistError}
            controls={
              <>
                <RangeInput
                  label="시작 ID"
                  value={artistStartId}
                  onChange={setArtistStartId}
                />
                <RangeInput
                  label="종료 ID"
                  value={artistEndId}
                  onChange={setArtistEndId}
                />
                <DryRunToggle
                  checked={artistDryRun}
                  onChange={setArtistDryRun}
                />
              </>
            }
            onRun={runArtistFillTask}
            running={artistPending}
          />

          <TaskCard
            title="곡 ↔ YouTube 토픽 매핑"
            description="토픽 채널 영상과 곡을 비교해 SongYoutubeVideo를 자동으로 채웁니다."
            status={youtubeSummary}
            error={youtubeError}
            controls={
              <>
                <RangeInput
                  label="시작 ID"
                  value={youtubeStartId}
                  onChange={setYoutubeStartId}
                />
                <RangeInput
                  label="종료 ID"
                  value={youtubeEndId}
                  onChange={setYoutubeEndId}
                />
                <DryRunToggle
                  checked={youtubeDryRun}
                  onChange={setYoutubeDryRun}
                />
              </>
            }
            onRun={runYoutubeTask}
            running={youtubePending}
            onCancel={cancelYoutubeTask}
          />
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  title,
  description,
  status,
  error,
  controls,
  onRun,
  running,
  onCancel,
}: {
  title: string;
  description: string;
  status: string | null;
  error: string | null;
  controls: ReactNode;
  onRun: () => void;
  running: boolean;
  onCancel?: () => void;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="md:w-1/4">
          <h2 className="text-base font-bold text-zinc-900">{title}</h2>
          <p className="text-xs text-zinc-500">{description}</p>
        </div>
        <div className="flex flex-1 flex-nowrap items-center gap-3 overflow-x-auto">
          {controls}
        </div>
        <div className="flex flex-col gap-2 md:w-48">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRun}
              disabled={running}
              className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {running ? "실행 중..." : "실행"}
            </button>
            {running && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex flex-1 cursor-pointer items-center justify-center rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:border-red-300 hover:text-red-700"
              >
                중단
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-zinc-500">
            {status ?? "미실행"}
          </p>
          {error && (
            <p className="text-center text-xs font-semibold text-red-600">
              {error}
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
