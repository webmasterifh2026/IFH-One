'use client';

import { FinanceQueuePage } from '@/components/workflow/finance-queue-page';

export default function BillCreationPage() {
  return (
    <FinanceQueuePage
      title="Bill Creation"
      description="Stage 18 — Finance team records the vendor bill"
      stage={18}
      slug="bill-creation"
    />
  );
}
