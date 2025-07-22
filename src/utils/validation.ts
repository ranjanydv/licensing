import { z } from 'zod';
import { LicenseStatus } from '../interfaces/license.interface';

/**
 * Feature validation schema
 */
export const featureSchema = z.object({
  name: z.string().min(1, 'Feature name is required'),
  enabled: z.boolean().default(true),
  restrictions: z.record(z.any()).optional()
});

/**
 * License request validation schema
 */
export const licenseRequestSchema = z.object({
  schoolId: z.string().min(1, 'School ID is required'),
  schoolName: z.string().min(1, 'School name is required'),
  duration: z.number().int().positive('Duration must be a positive number'),
  features: z.array(featureSchema).min(1, 'At least one feature is required'),
  metadata: z.record(z.any()).optional(),
  createdBy: z.string().optional()
});

/**
 * License update validation schema
 */
export const licenseUpdateSchema = z.object({
  schoolName: z.string().min(1).optional(),
  duration: z.number().int().positive().optional(),
  features: z.array(featureSchema).min(1).optional(),
  status: z.enum([
    LicenseStatus.ACTIVE, 
    LicenseStatus.EXPIRED, 
    LicenseStatus.REVOKED, 
    LicenseStatus.PENDING
  ]).optional(),
  metadata: z.record(z.any()).optional(),
  updatedBy: z.string().min(1, 'Updated by is required')
});

/**
 * License validation request schema
 */
export const licenseValidationSchema = z.object({
  licenseKey: z.string().min(1, 'License key is required'),
  schoolId: z.string().min(1, 'School ID is required')
});

/**
 * Validate data against a schema
 * @param schema Zod schema
 * @param data Data to validate
 * @returns Validated data or throws error
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}