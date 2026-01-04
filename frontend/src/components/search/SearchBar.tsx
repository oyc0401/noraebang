"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchSchema, type SearchFormData } from "@/lib/validation";
import { useUnifiedSearch } from "@/hooks/useUnifiedSearch";
import { cn } from "@/lib/cn";

export const SearchBar = () => {
  const { handleSearch, isSearching, error } = useUnifiedSearch();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SearchFormData>({
    resolver: zodResolver(searchSchema),
  });

  const onSubmit = (data: SearchFormData) => {
    handleSearch(data.query);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-2">
      <div className="flex gap-2">
        <input
          {...register("query")}
          placeholder="YouTube URL 또는 곡명/아티스트명"
          className={cn(
            "flex-1 px-4 py-3 rounded-lg bg-zinc-900 border text-white placeholder-zinc-500",
            "focus:outline-none focus:ring-2 focus:ring-white/20",
            errors.query ? "border-red-500" : "border-zinc-700",
          )}
          disabled={isSearching}
        />
        <button
          type="submit"
          disabled={isSearching}
          className="px-6 py-3 rounded-lg font-semibold bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
        >
          {isSearching ? "검색 중..." : "검색"}
        </button>
      </div>
      {(errors.query || error) && (
        <p className="text-sm text-red-400">{errors.query?.message || error}</p>
      )}
    </form>
  );
};
