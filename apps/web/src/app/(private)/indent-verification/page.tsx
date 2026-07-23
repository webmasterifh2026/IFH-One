'use client';

import { StageQueueWorkspace } from '@/components/workflow/stage-queue-workspace';

export default function IndentVerificationPage() {
  return (
    <StageQueueWorkspace
      title="Indent Verification"
      description="Stage 1 — Primary verification of submitted indents"
      stage={1}
      slug="indent-verification"
    />
  );
}
