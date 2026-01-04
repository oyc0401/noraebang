interface Props {
  message: string;
  icon?: string;
}

export const EmptyState = ({ message, icon = "🔍" }: Props) => (
  <div className="flex flex-col items-center justify-center p-12 text-center">
    <div className="text-6xl mb-4">{icon}</div>
    <p className="text-zinc-400">{message}</p>
  </div>
);
