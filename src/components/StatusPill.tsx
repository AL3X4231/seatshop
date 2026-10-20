import type { ReactNode } from 'react';
import type { Tone } from '../lib/format';

type StatusPillProps = {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
};

export function StatusPill({ tone = 'gray', children, dot = true, className = '' }: StatusPillProps) {
  return (
    <span className={`pill pill-${tone} ${className}`}>
      {dot ? <span className="pill-dot" /> : null}
      {children}
    </span>
  );
}

export function ModePill({ mode }: { mode: string }) {
  if (mode === 'demo') {
    return (
      <StatusPill tone="amber" dot={false} className="mode-pill">
        DÉMO
      </StatusPill>
    );
  }
  if (mode === 'test') {
    return (
      <StatusPill tone="blue" dot={false} className="mode-pill">
        TEST
      </StatusPill>
    );
  }
  return (
    <StatusPill tone="green" dot={false} className="mode-pill">
      LIVE
    </StatusPill>
  );
}
