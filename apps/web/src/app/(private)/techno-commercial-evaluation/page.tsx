'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function TechnoCommercialPage() {
  return (
    <StageQueueWorkspace
      title="Received Techno Commercial Offer from Suppliers"
      description="Stage 4 — Send Technical Offer to Project/Engineering Department | Comparison Sheet"
      stage={4}
      slug="techno-commercial-evaluation"
    />
  );
}