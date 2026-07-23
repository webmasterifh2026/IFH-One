'use client';

import { FinanceQueuePage } from '@/components/workflow/finance-queue-page';

export default function PaymentAdvicePage() {
  return (
    <FinanceQueuePage
      title="Payment Advice"
      description="Stage 22 — Generate final payment advice"
      stage={22}
      slug="payment-advice"
    />
  );
}
