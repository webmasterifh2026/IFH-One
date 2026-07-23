import { ReactNode, ElementType } from 'react';

interface EmptyStateProps {
  icon: ElementType;
  headline: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  headline,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-16 text-center ${className}`}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'var(--surface2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        <Icon style={{ width: 22, height: 22, color: 'var(--text-faint)' }} />
      </div>
      <h3
        style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}
      >
        {headline}
      </h3>
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-muted)',
          marginTop: 6,
          maxWidth: 360,
        }}
      >
        {description}
      </p>
      {action && <div style={{ marginTop: 20 }}>{action}</div>}
    </div>
  );
}
