import type { ReactNode } from 'react';
import { CircleDot } from 'lucide-react';

interface StatusPillProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}

export function StatusPill({ children, tone = 'neutral' }: StatusPillProps) {
  return (
    <span className={`status-pill status-pill--${tone}`}>
      <CircleDot size={11} aria-hidden="true" />
      {children}
    </span>
  );
}
