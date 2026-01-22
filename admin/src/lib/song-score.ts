// song-score.ts는 Spotify 인기, TJ 매핑 여부, YouTube 조회수를 조합해 곡 점수를 계산하는 순수 함수를 제공합니다.

export interface SongScoreMetrics {
  spotifyPopularities?: Array<number | null | undefined>;
  youtubeViewCounts?: Array<number | bigint | null | undefined>;
  hasTjSong: boolean;
}

const TJ_BONUS_MULTIPLIER = 0.2; // TJ 곡이면 최종 합계의 20%를 추가 보너스로 부여
const YOUTUBE_VIEW_NORMALIZER = 100_000; // 10만 조회수 단위 기여
const YOUTUBE_WEIGHT = 10;
const SCORE_PRECISION = 2;
const BEST_YOUTUBE_VIDEO_COUNT = 3;

const roundScore = (score: number) =>
  Math.round(score * 10 ** SCORE_PRECISION) / 10 ** SCORE_PRECISION;

const computeSpotifyComponent = (
  popularities: SongScoreMetrics["spotifyPopularities"],
) => {
  if (!popularities?.length) return 0;
  const max = popularities.reduce((acc, value) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(acc, value);
    }
    return acc;
  }, Number.NEGATIVE_INFINITY);
  return Number.isFinite(max) ? max : 0;
};

const normalizeViews = (views: number) => {
  if (!Number.isFinite(views) || views <= 0) return 0;
  const normalized = views / YOUTUBE_VIEW_NORMALIZER;
  return Math.log(1 + normalized) * YOUTUBE_WEIGHT;
};

const computeYoutubeComponent = (
  viewCounts: SongScoreMetrics["youtubeViewCounts"],
) => {
  if (!viewCounts?.length) return 0;
  const sorted = viewCounts
    .map((value) => Number(value ?? 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => b - a)
    .slice(0, BEST_YOUTUBE_VIDEO_COUNT);
  if (!sorted.length) return 0;
  const total = sorted.reduce((sum, value) => sum + value, 0);
  return normalizeViews(total);
};

export function calculateSongScore(metrics: SongScoreMetrics): number {
  const spotifyScore = computeSpotifyComponent(metrics.spotifyPopularities);
  const youtubeScore = computeYoutubeComponent(metrics.youtubeViewCounts);
  const baseScore = spotifyScore + youtubeScore;
  const boosted = metrics.hasTjSong
    ? baseScore * (1 + TJ_BONUS_MULTIPLIER)
    : baseScore;
  return roundScore(boosted);
}
