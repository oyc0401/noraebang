import { ThumbsUp } from "lucide-react";

interface RecommendationBadgeProps {
  count: number;
  onClick?: () => void;
}

export function RecommendationBadge({
  count,
  onClick,
}: RecommendationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-1.5 rounded-full bg-yellow-950/60 px-4 py-2 hover:bg-yellow-950/80 transition-colors"
    >
      <ThumbsUp className="size-5 text-yellow-500" />
      <span className="text-sm font-bold text-yellow-500">추천하기</span>
      <span className="text-sm font-bold text-yellow-500">{count}</span>
    </button>
  );
}
