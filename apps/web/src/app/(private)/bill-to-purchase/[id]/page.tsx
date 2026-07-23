'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { billToPurchaseConfig } from '@/lib/workflow/stage-configs/s17-bill-to-purchase';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={billToPurchaseConfig} backHref="/bill-to-purchase" />;
}