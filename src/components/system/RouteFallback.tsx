import { LoaderCircle } from 'lucide-react';

export function RouteFallback() {
  return (
    <main className="route-fallback" role="status" aria-live="polite" aria-busy="true">
      <LoaderCircle size={22} aria-hidden="true" />
      <span>Loading workspace…</span>
    </main>
  );
}
