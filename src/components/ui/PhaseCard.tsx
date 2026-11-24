import type { ReactNode } from 'react';

interface PhaseCardProps {
  icon: ReactNode;
  label: string;
  title: string;
  description: string;
  status?: string;
}

export function PhaseCard({ icon, label, title, description, status = 'Planned for a later phase' }: PhaseCardProps) {
  return (
    <article className="phase-card">
      <div className="phase-card__topline">
        <span className="phase-card__icon">{icon}</span>
        <span className="phase-card__label">{label}</span>
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <div className="phase-card__footer">{status}</div>
    </article>
  );
}
