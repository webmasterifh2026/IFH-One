'use client';

import { WorkflowQueuePage } from '@/components/workflow/workflow-queue-page';

export default function HoldRecordsPage() {
  return (
    <WorkflowQueuePage
      title="Hold Records"
      description="Procurement records currently on hold across all stages"
      status="ON_HOLD"
      queueTitle="On Hold"
      queueDescription="Records paused pending clarification or review"
      emptyMessage="No records are currently on hold."
    />
  );
}
