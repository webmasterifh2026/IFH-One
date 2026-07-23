'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { secondaryInspectionConfig } from '@/lib/workflow/stage-configs/s12-s13-s14-inspections';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={secondaryInspectionConfig}
      backHref="/secondary-inspection"
    />
  );
}
