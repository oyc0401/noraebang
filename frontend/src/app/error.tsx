"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white">
      <div className="text-center max-w-md px-4">
        <h1 className="text-2xl font-bold mb-4">오류가 발생했습니다</h1>
        <p className="text-zinc-400 mb-2">{error.message}</p>
        {error.digest && (
          <p className="text-xs text-zinc-600 mb-6">Error ID: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
