import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Permission Guard (v2.6.0)
 *
 * Checks that the authenticated user holds at least one of the permission keys
 * declared via @RequirePermissions(...) on the route handler or controller.
 *
 * Permission keys are carried in the JWT payload as req.user.permissions[].
 * Super Admin (role name == 'Super Admin') always passes.
 *
 * Falls through (allows) when no @RequirePermissions decorator is present.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Skip for public routes
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequirePermissions — allow through (route-level logic handles it)
    if (!requiredPermissions || requiredPermissions.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const userRoles: string[] = req.user?.roles || [];
    const userPermissions: string[] = req.user?.permissions || [];

    // Super Admin bypasses all permission checks
    const isSuperAdmin = userRoles.some(
      (r) => r === 'Super Admin' || r === 'SUPER_ADMIN',
    );
    if (isSuperAdmin) return true;

    const hasPermission = requiredPermissions.some((p) =>
      userPermissions.includes(p),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Access denied. Required permission(s): ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
