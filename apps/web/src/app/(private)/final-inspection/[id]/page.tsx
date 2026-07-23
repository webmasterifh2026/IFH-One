'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { finalInspectionConfig } from '@/lib/workflow/stage-configs/s12-s13-s14-inspections';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={finalInspectionConfig}
      backHref="/final-inspection"
    />
  );
}
