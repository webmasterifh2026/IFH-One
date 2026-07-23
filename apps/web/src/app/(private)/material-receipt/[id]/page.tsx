'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { materialReceiptConfig } from '@/lib/workflow/stage-configs/s11-material-receipt';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={materialReceiptConfig} backHref="/material-receipt" />;
}