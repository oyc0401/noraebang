import { Clock, Flame } from "lucide-react";

type SearchTermCardProps = {
  term: string;
  type: "recent" | "popular";
  onClick: () => void;
};

export function SearchTermCard({ term, type, onClick }: SearchTermCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-2 py-4 rounded-lg hover:bg-white/7 cursor-pointer transition-colors text-left flex items-center gap-3"
    >
      {type === "recent" ? (
        <Clock className="size-5 text-gray-400" />
      ) : (
        <Flame className="size-5 text-gray-400" />
      )}
      <span className="text-white flex-1">{term}</span>
    </button>
  );
}
