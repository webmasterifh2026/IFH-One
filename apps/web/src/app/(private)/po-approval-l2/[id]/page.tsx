'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { poApprovalL2Config } from '@/lib/workflow/stage-configs/s7-s8-po-approval';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={poApprovalL2Config} backHref="/po-approval-l2" />;
}