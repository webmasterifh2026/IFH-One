'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function DebitNotePage() {
  return (
    <StageQueueWorkspace
      title="Debit Note Preparation"
      description="Stage 16 — Prepare debit note for rejections"
      stage={15}
      slug="debit-note"
    />
  );
}