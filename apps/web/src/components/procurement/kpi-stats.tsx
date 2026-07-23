'use client';

import { BarChart3, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';

export interface KPIStatsProps {
  pending: number;
  completed: number;
  delayed: number;
  averageTime: number;
  approvalRate?: number;
  successRate?: number;
}

export function KPIStats({
  pending,
  completed,
  delayed,
  averageTime,
  approvalRate,
  successRate,
}: KPIStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <StatCard
        title="Pending"
        value={pending}
        trend={pending > 0 ? `${pending} active` : 'None'}
        trendDirection="neutral"
        icon={Clock}
      />
      <StatCard
        title="Completed"
        value={completed}
        trend={completed > 0 ? `+${completed}` : '0'}
        trendDirection={completed > 0 ? 'up' : 'neutral'}
        icon={CheckCircle2}
      />
      <StatCard
        title="Delayed"
        value={delayed}
        trend={delayed > 0 ? `${delayed} items` : 'On track'}
        trendDirection={delayed > 0 ? 'down' : 'up'}
        icon={AlertCircle}
      />
      <StatCard
        title="Avg Processing"
        value={`${averageTime}d`}
        trend={averageTime < 10 ? 'Fast' : 'Normal'}
        trendDirection={averageTime < 10 ? 'up' : 'neutral'}
        icon={BarChart3}
      />
    </div>
  );
}
