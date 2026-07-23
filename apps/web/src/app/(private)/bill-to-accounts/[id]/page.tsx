'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { billToAccountsConfig } from '@/lib/workflow/stage-configs/s16-bill-to-accounts';

export default function WorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={billToAccountsConfig}
      backHref="/bill-to-accounts"
    />
  );
}
