import React from 'react';

/** Accessible placeholder shown while a lazily loaded route chunk downloads. */
export const PageLoader: React.FC = () => (
  <div role="status" aria-live="polite" className="max-w-5xl mx-auto px-4 py-10 space-y-3">
    <span className="sr-only">Loading page…</span>
    <div className="h-8 w-1/3 rounded-lg bg-[var(--ap-border)]/50 animate-pulse" />
    <div className="h-40 w-full rounded-xl bg-[var(--ap-border)]/40 animate-pulse" />
    <div className="h-24 w-full rounded-xl bg-[var(--ap-border)]/30 animate-pulse" />
  </div>
);
