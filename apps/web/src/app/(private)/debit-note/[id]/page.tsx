'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { debitNoteConfig } from '@/lib/workflow/stage-configs/s15-debit-note';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={debitNoteConfig} backHref="/debit-note" />;
}