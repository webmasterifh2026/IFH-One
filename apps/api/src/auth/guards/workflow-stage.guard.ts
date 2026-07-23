import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

export const WORKFLOW_STAGE_KEY = 'workflowStageCheck';

export type WorkflowStageAction =
  | 'view'
  | 'edit'
  | 'approve'
  | 'reject'
  | 'hold'
  | 'bulk_update'
  | 'export'
  | 'reassign';

export interface WorkflowStageCheck {
  stage: number | 'param'; // 'param' = read stage number from req.params.stage
  action: WorkflowStageAction;
  paramName?: string; // defaults to 'stage'
}

import { SetMetadata } from '@nestjs/common';

/**
 * Decorator that marks a route as requiring a specific workflow stage action.
 *
 * @param stage  Stage number, or 'param' to read it from the request parameter
 * @param action The action being performed at this stage
 * @param paramName  Request param name when stage === 'param' (default: 'stage')
 *
 * Usage:
 *   @WorkflowStage(7, 'approve')            // stage 7 approve
 *   @WorkflowStage('param', 'edit', 'stageNumber')  // dynamic stage from :stageNumber param
 */
export const WorkflowStage = (
  stage: number | 'param',
  action: WorkflowStageAction,
  paramName = 'stage',
) => SetMetadata(WORKFLOW_STAGE_KEY, { stage, action, paramName });

@Injectable()
export class WorkflowStageGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const check = this.reflector.getAllAndOverride<WorkflowStageCheck>(
      WORKFLOW_STAGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!check) return true;

    const req = context.switchToHttp().getRequest();
    const userRoles: string[] = req.user?.roles || [];
    const userPermissions: string[] = req.user?.permissions || [];

    // Super Admin always passes
    const isSuperAdmin = userRoles.some(
      (r) => r === 'Super Admin' || r === 'SUPER_ADMIN',
    );
    if (isSuperAdmin) return true;

    // Resolve stage number
    let stageNum: number;
    if (check.stage === 'param') {
      const paramVal = req.params?.[check.paramName ?? 'stage'];
      stageNum = parseInt(paramVal, 10);
      if (isNaN(stageNum)) {
        throw new ForbiddenException('Invalid stage parameter');
      }
    } else {
      stageNum = check.stage;
    }

    // Check the permission key for this stage + action
    const permKey = `workflow.stage${stageNum}.${check.action}`;
    if (userPermissions.includes(permKey)) return true;

    throw new ForbiddenException(
      `You do not have permission to perform '${check.action}' at stage ${stageNum}`,
    );
  }
}
