'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { negotiationConfig } from '@/lib/workflow/stage-configs/s5-negotiation';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={negotiationConfig}
      backHref="/negotiation"
    />
  );
}
