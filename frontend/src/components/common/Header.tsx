import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { useSearchStore } from "@/store/searchStore";
import { Logo } from "./Logo";

interface HeaderProps {
  transparent?: boolean;
}

export function Header({ transparent }: HeaderProps) {
  const { setSearchActive } = useSearchStore();

  return (
    <header
      className={cn(
        "z-20 flex h-14 items-center justify-between pl-4 pr-1.5",
        transparent
          ? "bg-transparent"
          : "sticky top-0 bg-background-dark/95 backdrop-blur-md",
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-4 text-white transition-opacity hover:opacity-80"
      >
        <Logo />
        <h1 className="text-lg font-semibold tracking-[-0.015em]">Sing It!</h1>
      </Link>
      <div className="flex items-center">
        <button
          type="button"
          className="flex size-11 items-center justify-center text-white/80 transition-colors hover:text-white"
          aria-label="검색"
          onClick={() => setSearchActive(true)}
        >
          <Search className="size-6" />
        </button>
      </div>
    </header>
  );
}
