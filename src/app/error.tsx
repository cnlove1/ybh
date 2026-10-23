'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (window === window.parent) return;

    window.parent.postMessage({
      type: 'APP_ERROR',
      payload: [{
        message: error.message,
        stack: error.stack,
        source: 'react-error-boundary',
      }],
    }, '*');
  }, [error]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h2 className="text-2xl font-bold">出错了</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <button
        className="cursor-pointer rounded-md bg-primary px-4 py-2 text-primary-foreground transition-all hover:opacity-80 active:scale-95"
        onClick={reset}
      >
        重试
      </button>
    </div>
  );
}
