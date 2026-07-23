'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { billApprovalL2Config } from '@/lib/workflow/stage-configs/s20-s21-bill-approval';

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <StageWorkspace id={id} config={billApprovalL2Config} backHref="/bill-approval-l2" />;
}