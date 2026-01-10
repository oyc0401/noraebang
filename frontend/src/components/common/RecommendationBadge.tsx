import { ThumbsUp } from "lucide-react";

interface RecommendationBadgeProps {
  count: number;
}

export function RecommendationBadge({ count }: RecommendationBadgeProps) {
  return (
    <span className="inline-flex h-10 items-center gap-1.5 rounded-full bg-yellow-950/60 px-4 py-2">
      <ThumbsUp className="size-5 text-yellow-500" />
      <span className="text-sm font-bold text-yellow-500">추천하기</span>
      <span className="text-sm font-bold text-yellow-500">{count}</span>
    </span>
  );
}
