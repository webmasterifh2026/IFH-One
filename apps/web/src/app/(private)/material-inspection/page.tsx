'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function MaterialInspectionPage() {
  return (
    <StageQueueWorkspace
      title="Material Inspection"
      description="Stage 13 — Initial quality inspection"
      stage={12}
      slug="material-inspection"
    />
  );
}