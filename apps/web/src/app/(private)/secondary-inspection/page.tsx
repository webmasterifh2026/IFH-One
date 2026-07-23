'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function SecondaryInspectionPage() {
  return (
    <StageQueueWorkspace
      title="Secondary Inspection"
      description="Stage 14 — Secondary technical inspection"
      stage={13}
      slug="secondary-inspection"
    />
  );
}