'use client';

import { FinanceQueuePage } from '@/components/workflow/finance-queue-page';

export default function TallyEntryPage() {
  return (
    <FinanceQueuePage
      title="Tally Entry"
      description="Stage 19 — Record bill in accounting system"
      stage={19}
      slug="tally-entry"
    />
  );
}
