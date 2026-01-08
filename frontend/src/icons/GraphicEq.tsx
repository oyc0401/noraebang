
export function GraphicEq(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <line x1="7" y1="20" x2="7" y2="4" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="17" y1="20" x2="17" y2="4" />
    </svg>
  );
}
