import Image from "next/image";

interface ArtistCardVerticalProps {
  thumbnail?: string;
  name: string;
  nameKo: string;
  onClick?: () => void;
}

export function ArtistCardVertical({
  thumbnail,
  name,
  nameKo,
  onClick,
}: ArtistCardVerticalProps) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: 카드 전체가 클릭 가능 영역
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick?.();
        }
      }}
      className="w-[100px] shrink-0 cursor-pointer"
    >
      <div className="relative aspect-square w-full rounded-full bg-gray-700 overflow-hidden">
        {thumbnail && (
          <Image
            src={thumbnail}
            alt={name}
            fill
            sizes="100px"
            className="object-cover"
            unoptimized
          />
        )}
      </div>
      <div className="mt-2">
        <p className="text-sm font-semibold text-white line-clamp-2 leading-tight">
          {name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{nameKo}</p>
      </div>
    </div>
  );
}
