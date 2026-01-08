"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function TopAppBar() {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 justify-between border-b border-gray-200 dark:border-white/5">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      >
        <ArrowLeft className="text-slate-900 dark:text-white" size={24} />
      </button>
      <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-10">
        아티스트 정보
      </h2>
    </header>
  );
}
