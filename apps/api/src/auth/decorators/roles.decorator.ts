import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to users holding at least one of the given role names.
 * Role names are matched case-insensitively against req.user.roles (JWT claim).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
