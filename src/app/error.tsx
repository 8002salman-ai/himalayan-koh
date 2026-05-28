'use client';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f7f3ed] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-[#3d3832] mb-2">Something went wrong</h1>
        <p className="text-sm text-[#6b6560] mb-6">{error.message || 'The page failed to load.'}</p>
        <button
          type="button"
          onClick={() => reset()}
          className="px-6 py-3 bg-[#c45c26] text-white font-semibold rounded-xl hover:opacity-90"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
