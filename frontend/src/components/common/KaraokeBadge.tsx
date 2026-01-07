interface KaraokeBadgeProps {
  provider: "TJ" | "KY";
  number: string;
}

export function KaraokeBadge({ provider, number }: KaraokeBadgeProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-[#1D1D42] px-2 py-1">
      <span className="text-[10px] font-bold text-[#63AAFF]">
        {provider} {number}
      </span>
    </div>
  );
}
