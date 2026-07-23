import { ReactNode } from 'react';

interface EnterpriseCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
}

export function EnterpriseCard({
  children,
  className = '',
  noPadding = false,
  onClick,
}: EnterpriseCardProps) {
  return (
    <div
      className={`ifh-card ${noPadding ? '!p-0' : ''} ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {children}
    </div>
  );
}

interface EnterpriseCardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EnterpriseCardHeader({
  title,
  description,
  action,
  className = '',
}: EnterpriseCardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`}>
      <div>
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </h3>
        {description && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-muted)',
              marginTop: 2,
              lineHeight: 1.5,
            }}
          >
            {description}
          </p>
        )}
      </div>
      {action && <div className="ml-4 flex-shrink-0">{action}</div>}
    </div>
  );
}
