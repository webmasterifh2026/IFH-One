'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { poCreationConfig } from '@/lib/workflow/stage-configs/s6-po-creation';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={poCreationConfig} backHref="/purchase-orders" />;
}