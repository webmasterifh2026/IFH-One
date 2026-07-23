'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { rfqConfig } from '@/lib/workflow/stage-configs/s3-rfq';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={rfqConfig} backHref="/rfq" />;
}