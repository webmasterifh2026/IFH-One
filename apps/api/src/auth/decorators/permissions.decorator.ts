import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Restricts a route to users holding at least one of the given permission keys.
 * Permission keys are matched against the user's aggregated permission set from the JWT.
 *
 * Usage: @RequirePermissions('indent.create', 'indent.edit')
 * (user needs at least ONE of the listed keys)
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
