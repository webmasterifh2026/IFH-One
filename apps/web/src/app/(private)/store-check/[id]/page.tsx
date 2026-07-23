'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { storeCheckConfig } from '@/lib/workflow/stage-configs/s2-store-check';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={storeCheckConfig} backHref="/store-check" />;
}