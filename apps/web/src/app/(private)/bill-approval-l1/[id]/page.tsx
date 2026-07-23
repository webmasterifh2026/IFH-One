'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { billApprovalL1Config } from '@/lib/workflow/stage-configs/s20-s21-bill-approval';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={billApprovalL1Config} backHref="/bill-approval-l1" />;
}