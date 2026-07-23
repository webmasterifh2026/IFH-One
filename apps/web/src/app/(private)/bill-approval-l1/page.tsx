'use client';

import { FinanceQueuePage } from '@/components/workflow/finance-queue-page';

export default function BillApprovalL1Page() {
  return (
    <FinanceQueuePage
      title="Bill Approval L1"
      description="Stage 20 — Primary approval of recorded bill"
      stage={20}
      slug="bill-approval-l1"
    />
  );
}
