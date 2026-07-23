'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { vendorFollowUpConfig } from '@/lib/workflow/stage-configs/s10-vendor-follow-up';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={vendorFollowUpConfig} backHref="/vendor-follow-up" />;
}