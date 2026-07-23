'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function VendorAcceptancePage() {
  return (
    <StageQueueWorkspace
      title="Vendor Acceptance"
      description="Stage 10 — Vendor acknowledgment of PO"
      stage={9}
      slug="vendor-acceptance"
    />
  );
}