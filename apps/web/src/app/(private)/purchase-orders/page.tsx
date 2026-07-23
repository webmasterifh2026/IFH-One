'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function PurchaseOrdersPage() {
  return (
    <StageQueueWorkspace
      title="Purchase Order Creation"
      description="Stage 6 — Draft and submit purchase orders"
      stage={6}
      slug="purchase-orders"
    />
  );
}