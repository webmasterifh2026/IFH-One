'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function NegotiationPage() {
  return (
    <StageQueueWorkspace
      title="Negotiation and Decision"
      description="Stage 5 — Vendor negotiation and finalization"
      stage={5}
      slug="negotiation"
    />
  );
}
