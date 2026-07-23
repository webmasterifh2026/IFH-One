'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { paymentAdviceConfig } from '@/lib/workflow/stage-configs/s22-payment-advice';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={paymentAdviceConfig}
      backHref="/payment-advice"
    />
  );
}
