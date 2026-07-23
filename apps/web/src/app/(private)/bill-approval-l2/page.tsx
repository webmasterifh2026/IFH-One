'use client';

import { FinanceQueuePage } from '@/components/workflow/finance-queue-page';

export default function BillApprovalL2Page() {
  return (
    <FinanceQueuePage
      title="Bill Approval L2"
      description="Stage 21 — Final management approval of bill"
      stage={21}
      slug="bill-approval-l2"
    />
  );
}
