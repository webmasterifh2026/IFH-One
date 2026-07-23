'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { technoCommercialConfig } from '@/lib/workflow/stage-configs/s4-techno-commercial';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={technoCommercialConfig}
      backHref="/techno-commercial-evaluation"
    />
  );
}
