'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function MaterialReceiptPage() {
  return (
    <StageQueueWorkspace
      title="Material Receipt"
      description="Stage 12 — Record material receipt (GRN)"
      stage={11}
      slug="material-receipt"
    />
  );
}