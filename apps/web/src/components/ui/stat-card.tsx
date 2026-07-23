import { ElementType } from 'react';
import { EnterpriseCard } from './enterprise-card';

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendDirection?: 'up' | 'down' | 'neutral';
  icon: ElementType;
}

export function StatCard({ title, value, trend, trendDirection = 'neutral', icon: Icon }: StatCardProps) {
  return (
    <EnterpriseCard className="flex flex-col">
      <div className="flex items-center gap-3 mb-3">
        <div
          className="flex-shrink-0 flex items-center justify-center rounded-xl"
          style={{ width: 38, height: 38, background: 'var(--primary-light)' }}
        >
          <Icon style={{ width: 17, height: 17, color: 'var(--primary)' }} />
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
          {title}
        </span>
      </div>
      <div className="flex items-end gap-3">
        <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.02em', fontFamily: 'var(--font-sans)' }}>
          {value}
        </span>
        {trend && (
          <span style={{
            fontSize: 12, fontWeight: 500, marginBottom: 2,
            color: trendDirection === 'up' ? '#16A34A' : trendDirection === 'down' ? '#DC2626' : 'var(--text-muted)',
          }}>
            {trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : ''} {trend}
          </span>
        )}
      </div>
    </EnterpriseCard>
  );
}
