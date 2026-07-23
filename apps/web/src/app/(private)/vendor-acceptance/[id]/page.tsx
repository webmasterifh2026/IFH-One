'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { vendorAcceptanceConfig } from '@/lib/workflow/stage-configs/s9-vendor-acceptance';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={vendorAcceptanceConfig}
      backHref="/vendor-acceptance"
    />
  );
}
