'use client';

import { FinanceQueuePage } from '@/components/workflow/finance-queue-page';

export default function BillToPurchasePage() {
  return (
    <FinanceQueuePage
      title="Bill Sent To Purchase"
      description="Stage 17 — Bill verified and sent to Purchase"
      stage={17}
      slug="bill-to-purchase"
    />
  );
}
