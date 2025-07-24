import { z } from 'zod';

/**
 * Registration request schema
 */
export const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional()
});

/**
 * Login request schema
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

/**
 * Refresh token request schema
 */
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
});

/**
 * Create user request schema
 */
export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  role: z.string().min(1, 'Role is required')
});

/**
 * Update user request schema
 */
export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  role: z.string().min(1, 'Role is required').optional(),
  isActive: z.boolean().optional()
});

/**
 * User ID param schema
 */
export const userIdParamSchema = z.object({
  id: z.string().min(1, 'User ID is required')
});

/**
 * Create role request schema
 */
export const createRoleSchema = z.object({
  name: z.enum(['admin', 'support'], {
    errorMap: () => ({ message: 'Role name must be either admin or support' })
  }),
  permissions: z.array(z.string()).min(1, 'At least one permission is required')
});

/**
 * Update role request schema
 */
export const updateRoleSchema = z.object({
  name: z.enum(['admin', 'support'], {
    errorMap: () => ({ message: 'Role name must be either admin or support' })
  }).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required').optional()
});

/**
 * Role ID param schema
 */
export const roleIdParamSchema = z.object({
  id: z.string().min(1, 'Role ID is required')
});

/**
 * Add permission request schema
 */
export const addPermissionSchema = z.object({
  permission: z.string().min(1, 'Permission is required')
});

/**
 * Assign role request schema
 */
export const assignRoleSchema = z.object({
  roleId: z.string().min(1, 'Role ID is required')
});