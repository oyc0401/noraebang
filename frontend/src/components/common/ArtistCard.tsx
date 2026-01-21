import Image from "next/image";

interface ArtistCardProps {
  thumbnail?: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
}

export function ArtistCard({
  thumbnail,
  title,
  subtitle,
  onClick,
}: ArtistCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-2 flex items-center gap-4 hover:bg-white/5 cursor-pointer transition-colors text-left"
    >
      {thumbnail && (
        <Image
          src={thumbnail}
          alt={title}
          width={48}
          height={48}
          className="rounded-full shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-white truncate">{title}</div>
        <div className="text-sm text-gray-400 truncate">{subtitle}</div>
      </div>
    </button>
  );
}
