'use client';

import { WorkflowQueuePage } from '@/components/workflow/workflow-queue-page';

export default function SecondaryVerificationPage() {
  return (
    <WorkflowQueuePage
      title="Secondary Verification"
      description="Stage 2 — Secondary verification of approved indents"
      stage={2}
      queueTitle="Secondary Verification Queue"
      queueDescription="Indents pending secondary verification"
      emptyMessage="Records appear here after primary verification is approved."
    />
  );
}
