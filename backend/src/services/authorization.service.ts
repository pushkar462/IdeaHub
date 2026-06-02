import prisma from '../config/db';
import { Role } from '@prisma/client';

export class AuthorizationService {
  /**
   * Evaluates if a given role possesses a specific permission.
   * Future implementation note: This should be backed by Redis or an in-memory 
   * LRU cache since permission checks happen on every request/socket event.
   */
  public async hasPermission(role: Role, permissionKey: string): Promise<boolean> {
    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        role,
        permission: {
          key: permissionKey
        }
      }
    });

    return !!rolePermission;
  }

  /**
   * Bulk fetch all permissions for a role (useful for JWT embedding or initial state load).
   */
  public async getRolePermissions(role: Role): Promise<string[]> {
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true }
    });

    return rolePermissions.map(rp => rp.permission.key);
  }
}

export const authorizationService = new AuthorizationService();
