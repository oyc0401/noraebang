import Image from "next/image";

interface SongCardVerticalProps {
  thumbnail?: string;
  title: string;
  subtitle: string;
  tjNumber?: string;
  bestProposeHit?: number;
}

export function SongCardVertical({
  thumbnail,
  title,
  subtitle,
  tjNumber,
  bestProposeHit,
}: SongCardVerticalProps) {
  return (
    <div className="w-[140px] shrink-0">
      <div className="relative aspect-square w-full rounded-md bg-gray-700 overflow-hidden">
        {thumbnail && (
          <Image
            src={thumbnail}
            alt={title}
            fill
            sizes="140px"
            className="object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="mt-2">
        <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">
          {title}
        </p>
        <p className="text-xs text-gray-400 truncate mt-0.5">{subtitle}</p>
        <div className="flex items-center gap-2 mt-1 text-xs">
          {tjNumber && <span className="text-[#CE8FED]">TJ {tjNumber}</span>}
          {bestProposeHit !== undefined && (
            <span className="text-[#C1B369]">추천 {bestProposeHit}</span>
          )}
        </div>
      </div>
    </div>
  );
}
