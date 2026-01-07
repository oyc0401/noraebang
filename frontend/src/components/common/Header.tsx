import { MicVocal, Search } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-background-dark/95 px-4 backdrop-blur-md">
      <div className="flex items-center gap-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#A855F7]">
          <MicVocal className="size-6 text-white" />
        </div>
        <h1 className="text-lg font-semibold tracking-[-0.015em] text-white">
          Sing It!
        </h1>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="text-white/80 transition-colors hover:text-white"
          aria-label="검색"
        >
          <Search className="size-6" />
        </button>
        <button
          type="button"
          aria-label="프로필"
          className="flex size-6 items-center justify-center rounded-full bg-white/20 text-[10px] font-semibold text-white"
        >
          SJ
        </button>
      </div>
    </header>
  );
}
