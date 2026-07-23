'use client';

import { WorkflowQueuePage } from '@/components/workflow/workflow-queue-page';

export default function RejectedRecordsPage() {
  return (
    <WorkflowQueuePage
      title="Rejected Records"
      description="Procurement records rejected during workflow"
      status="REJECTED"
      queueTitle="Rejected"
      queueDescription="Records that were rejected at any stage"
      emptyMessage="No rejected records found."
    />
  );
}
