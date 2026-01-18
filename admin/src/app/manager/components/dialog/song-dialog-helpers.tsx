"use client";

import type { ReactNode } from "react";

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-medium text-zinc-600">{label}</div>
      {children}
    </label>
  );
}

export function getRoleLabel(role: string): string {
  switch (role) {
    case "MAIN":
      return "메인";
    case "FEATURING":
      return "피처링";
    case "PRODUCER":
      return "프로듀서";
    default:
      return role;
  }
}

export function formatViewCount(viewCount?: string | null): string {
  if (!viewCount) return "0";
  const count = Number(viewCount);
  if (Number.isNaN(count)) return viewCount;
  if (count >= 100_000_000) {
    return `${(count / 100_000_000).toFixed(1)}억`;
  }
  if (count >= 10_000) {
    return `${(count / 10_000).toFixed(1)}만`;
  }
  return count.toLocaleString();
}
