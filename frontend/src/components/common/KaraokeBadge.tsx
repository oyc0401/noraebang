interface KaraokeBadgeProps {
  provider: "TJ" | "KY";
  number: string;
  isMR?: boolean;
  isMV?: boolean;
}

export function KaraokeBadge({
  provider,
  number,
  isMR,
  isMV,
}: KaraokeBadgeProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-[#1D1D42] px-2 py-1">
      <span className="text-[10px] font-bold text-[#63AAFF]">
        {provider} {number}
      </span>
      {isMR && (
        <span className="text-[10px] font-bold text-[#63AAFF]/70">(MR)</span>
      )}
      {isMV && (
        <span className="text-[10px] font-bold text-[#63AAFF]/70">(MV)</span>
      )}
    </div>
  );
}
