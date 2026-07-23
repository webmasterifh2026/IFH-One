'use client';

import { FinanceQueuePage } from '@/components/workflow/finance-queue-page';

export default function BillToAccountsPage() {
  return (
    <FinanceQueuePage
      title="Bill Sent To Accounts"
      description="Stage 16 — Vendor bill forwarded to Accounts"
      stage={16}
      slug="bill-to-accounts"
    />
  );
}
