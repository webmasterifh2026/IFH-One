'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function VendorFollowUpPage() {
  return (
    <StageQueueWorkspace
      title="Vendor Follow-Up"
      description="Stage 11 — Follow up with vendor on delivery"
      stage={10}
      slug="vendor-follow-up"
    />
  );
}
