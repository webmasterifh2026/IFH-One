'use client';

/**
 * Backward-compatibility re-export.
 * IndentVerificationWorkspace delegates to the shared StageQueueWorkspace.
 * The S2 queue page imports this — both point to the same component.
 */
export { StageQueueWorkspace as IndentVerificationWorkspace } from './stage-queue-workspace';
