import { cn } from "@/lib/cn";

const PROVIDER_COLORS = {
  TJ: "bg-blue-600 text-blue-50",
  KY: "bg-emerald-600 text-emerald-50",
  JOYSOUND: "bg-purple-600 text-purple-50",
} as const;

interface Props {
  provider: keyof typeof PROVIDER_COLORS;
  karaokeNo: string;
  title?: string | null;
  artist?: string | null;
}

export const KaraokeBadge = ({ provider, karaokeNo, title, artist }: Props) => (
  <div
    className={cn(
      "px-3 py-1 rounded-full text-xs font-semibold",
      PROVIDER_COLORS[provider],
    )}
  >
    <div>
      {provider} {karaokeNo}
    </div>
    {title && <div className="text-[10px] opacity-80">{title}</div>}
    {artist && <div className="text-[10px] opacity-80">{artist}</div>}
  </div>
);
