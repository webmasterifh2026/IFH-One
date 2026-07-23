'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function RFQPage() {
  return (
    <StageQueueWorkspace
      title="Float RFQ"
      description="Stage 3 — Float Request for Quotation to suppliers"
      stage={3}
      slug="rfq"
    />
  );
}