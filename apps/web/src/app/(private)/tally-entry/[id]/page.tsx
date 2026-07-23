'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { tallyEntryConfig } from '@/lib/workflow/stage-configs/s19-tally-entry';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={tallyEntryConfig} backHref="/tally-entry" />;
}