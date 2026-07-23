'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function StoreCheckPage() {
  return (
    <StageQueueWorkspace
      title="Store Availability Check"
      description="Stage 3 — Inventory verification and allocation"
      stage={2}
      slug="store-check"
    />
  );
}