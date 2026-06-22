"use client";

export function Loading({ message = "Memuat..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-primary" />
      <p className="mt-3 text-sm text-gray-500">{message}</p>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-danger">
        !
      </div>
      <p className="text-sm text-gray-600">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-outline mt-4 text-sm">
          Coba Lagi
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}
