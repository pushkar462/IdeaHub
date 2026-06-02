import { Request, Response, NextFunction } from 'express';
import { authorizationService } from '../services/authorization.service';
import { AppError } from '../utils/AppError';
import { StatusCodes } from 'http-status-codes';
import { Role } from '@prisma/client';

/**
 * Middleware factory to enforce specific RBAC permissions on a route.
 * Assumes requireAuth has already run and populated req.user.
 */
export const requirePermission = (permissionKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;
      if (!user) {
        throw new AppError('Unauthorized. Please log in.', StatusCodes.UNAUTHORIZED, 'UNAUTHORIZED');
      }

      const hasPerm = await authorizationService.hasPermission(user.role as Role, permissionKey);
      
      if (!hasPerm) {
        throw new AppError(`Forbidden. Missing required permission: ${permissionKey}`, StatusCodes.FORBIDDEN, 'FORBIDDEN_PERMISSION');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
