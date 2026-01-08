import Link from "next/link";
import { MicVocal, Search } from "lucide-react";
import { useSearchStore } from "@/store/searchStore";
import { Logo } from "./Logo";

export function Header() {
  const { setSearchActive } = useSearchStore();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between bg-background-dark/95 px-4 backdrop-blur-md">
      <Link
        href="/"
        className="flex items-center gap-4 text-white transition-opacity hover:opacity-80"
      >
        <Logo />
        <h1 className="text-lg font-semibold tracking-[-0.015em]">Sing It!</h1>
      </Link>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="text-white/80 transition-colors hover:text-white"
          aria-label="검색"
          onClick={() => setSearchActive(true)}
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
