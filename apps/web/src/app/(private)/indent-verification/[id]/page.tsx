'use client';

import { use } from 'react';
import { StageWorkspace } from '@/components/workflow/generic/StageWorkspace';
import { indentVerificationConfig } from '@/lib/workflow/stage-configs/s1-indent-verification';

export default function IndentVerificationWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <StageWorkspace
      id={id}
      config={indentVerificationConfig}
      backHref="/indent-verification"
    />
  );
}
