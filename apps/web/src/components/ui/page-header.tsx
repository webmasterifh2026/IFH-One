import { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  isDashboard?: boolean;
}

export function PageHeader({ title, description, actions, isDashboard = false }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4" style={{ marginBottom: 28 }}>
      <div>
        <h1
          className="font-display"
          style={{
            fontSize: isDashboard ? 32 : 24,
            fontWeight: 400,
            color: 'var(--text-primary)',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </h1>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.55 }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
