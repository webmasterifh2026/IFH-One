'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function POApprovalL1Page() {
  return (
    <StageQueueWorkspace
      title="PO Approval Level 1"
      description="Stage 8 — First level purchase order approval"
      stage={7}
      slug="po-approval-l1"
    />
  );
}
