'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function POApprovalL2Page() {
  return (
    <StageQueueWorkspace
      title="PO Approval Level 2"
      description="Stage 9 — Second level purchase order approval"
      stage={8}
      slug="po-approval-l2"
    />
  );
}
