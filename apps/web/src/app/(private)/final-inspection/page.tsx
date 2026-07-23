'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function FinalInspectionPage() {
  return (
    <StageQueueWorkspace
      title="Final Inspection"
      description="Stage 15 — Final inspection sign-off"
      stage={14}
      slug="final-inspection"
    />
  );
}