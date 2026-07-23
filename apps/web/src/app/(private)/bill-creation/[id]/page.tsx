'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { billCreationConfig } from '@/lib/workflow/stage-configs/s18-bill-creation';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={billCreationConfig}
      backHref="/bill-creation"
    />
  );
}
