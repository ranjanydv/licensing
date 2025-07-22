import { Request, Response } from 'express';
import { z } from 'zod';
import { catchAsync, LicenseError } from '../middlewares/errorHandler';
import { licenseService } from '../services/license.service';
import { Logger } from '../utils/logger';

// Validation schemas using zod
const hardwareFingerprintSchema = z.object({
  hardwareInfo: z.object({
    cpuId: z.string().optional(),
    diskId: z.string().optional(),
    macAddress: z.string().optional(),
    hostname: z.string().optional(),
    osInfo: z.object({
      platform: z.string().optional(),
      release: z.string().optional(),
      arch: z.string().optional()
    }).passthrough().optional()
  }).passthrough()
});

const ipRestrictionsSchema = z.object({
  enabled: z.boolean(),
  allowedIps: z.array(z.string()),
  allowedCountries: z.array(z.string()).optional()
});

const deviceLimitSchema = z.object({
  enabled: z.boolean(),
  maxDevices: z.number().int().min(1)
});

const blacklistSchema = z.object({
  reason: z.string()
});

const logger = new Logger('SecurityController');

/**
 * Register hardware fingerprint for a license
 * @route POST /api/licenses/:id/hardware-binding
 */
export const registerHardwareFingerprint = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate request body
  const validatedBody = hardwareFingerprintSchema.parse(req.body);

  // Register hardware fingerprint
  const license = await licenseService.registerHardwareFingerprint(id, validatedBody.hardwareInfo);

  // Check if license exists
  if (!license) {
    throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
  }

  // Return success response
  res.status(200).json({
    status: 'success',
    data: {
      message: 'Hardware fingerprint registered successfully',
      fingerprintCount: license.securityRestrictions?.hardwareBinding?.fingerprints.length || 0
    }
  });
});

/**
 * Remove hardware fingerprint from a license
 * @route DELETE /api/licenses/:id/hardware-binding/:fingerprint
 */
export const removeHardwareFingerprint = catchAsync(async (req: Request, res: Response) => {
  const { id, fingerprint } = req.params;

  // Get updatedBy from authenticated user
  const updatedBy = req.body.userId || 'system';

  // Remove hardware fingerprint
  const license = await licenseService.removeHardwareFingerprint(id, fingerprint);

  // Check if license exists
  if (!license) {
    throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
  }

  // Return success response
  res.status(200).json({
    status: 'success',
    data: {
      message: 'Hardware fingerprint removed successfully',
      fingerprintCount: license.securityRestrictions?.hardwareBinding?.fingerprints.length || 0
    }
  });
});

/**
 * Update IP restrictions for a license
 * @route PUT /api/licenses/:id/ip-restrictions
 */
export const updateIpRestrictions = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate request body
  const validatedBody = ipRestrictionsSchema.parse(req.body);
  const ipRestrictions = {
    enabled: validatedBody.enabled,
    allowedIps: validatedBody.allowedIps,
    allowedCountries: validatedBody.allowedCountries
  };

  // Update IP restrictions
  const license = await licenseService.updateIpRestrictions(id, ipRestrictions);

  // Check if license exists
  if (!license) {
    throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
  }

  // Return success response
  res.status(200).json({
    status: 'success',
    data: {
      message: 'IP restrictions updated successfully',
      ipRestrictions: license.securityRestrictions?.ipRestrictions
    }
  });
});

/**
 * Update device limit for a license
 * @route PUT /api/licenses/:id/device-limit
 */
export const updateDeviceLimit = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate request body
  const validatedBody = deviceLimitSchema.parse(req.body);
  const deviceLimit = {
    enabled: validatedBody.enabled,
    maxDevices: validatedBody.maxDevices
  };

  // Update device limit
  const license = await licenseService.updateDeviceLimit(id, deviceLimit);

  // Check if license exists
  if (!license) {
    throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
  }

  // Return success response
  res.status(200).json({
    status: 'success',
    data: {
      message: 'Device limit updated successfully',
      deviceLimit: license.securityRestrictions?.deviceLimit
    }
  });
});

/**
 * Blacklist a license
 * @route POST /api/licenses/:id/blacklist
 */
export const blacklistLicense = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Validate request body
  const validatedBody = blacklistSchema.parse(req.body);
  const reason = validatedBody.reason;

  // Get updatedBy from authenticated user
  const updatedBy = req.body.userId || 'system';

  // Blacklist license
  const license = await licenseService.blacklistLicense(id, reason, updatedBy);

  // Check if license exists
  if (!license) {
    throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
  }

  // Return success response
  res.status(200).json({
    status: 'success',
    data: {
      message: 'License blacklisted successfully',
      blacklisted: true,
      reason
    }
  });
});

/**
 * Remove a license from blacklist
 * @route DELETE /api/licenses/:id/blacklist
 */
export const removeFromBlacklist = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  // Get updatedBy from authenticated user
  const updatedBy = req.body.userId || 'system';

  // Remove from blacklist
  const license = await licenseService.removeFromBlacklist(id, updatedBy);

  // Check if license exists
  if (!license) {
    throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
  }

  // Return success response
  res.status(200).json({
    status: 'success',
    data: {
      message: 'License removed from blacklist successfully',
      blacklisted: false
    }
  });
});

/**
 * Check if a license is blacklisted
 * @route GET /api/licenses/:idOrKey/blacklist-status
 */
export const checkBlacklistStatus = catchAsync(async (req: Request, res: Response) => {
  const { idOrKey } = req.params;

  // Check blacklist status
  const result = await licenseService.checkBlacklist(idOrKey);

  // Return success response
  res.status(200).json({
    status: 'success',
    data: result
  });
});