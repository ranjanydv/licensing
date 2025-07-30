import { Request, Response } from 'express';
import { catchAsync, AppError } from '../middlewares/errorHandler';
import { licenseActivationService } from '../services/licenseActivation.service';
import { licenseHexValidationService } from '../services/licenseHexValidation.service';
import { validate, activationRequestSchema, hexValidationRequestSchema } from '../utils/validation';
import { ActivationRequest, HexValidationRequest } from '../interfaces/license.interface';
import { Logger } from '../utils/logger';
import { AuthRequest } from '@/interfaces/auth.interface';

const logger = new Logger('LicenseActivationController');

/**
 * Activate a license
 * @route POST /api/licenses/activate
 */
export const activateLicense = catchAsync(async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const activationData = validate(activationRequestSchema, req.body) as ActivationRequest;
    
    // Activate license
    const result = await licenseActivationService.activateLicense(activationData, req.user?.id || 'system');
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Error in license activation:', { error });
    throw new AppError(`Failed to activate license: ${(error as Error).message}`, 500);
  }
});

/**
 * Validate license hex
 * @route POST /api/licenses/validate-hex
 */
export const validateLicenseHex = catchAsync(async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationData = validate(hexValidationRequestSchema, req.body) as HexValidationRequest;

    
    // Validate hex
    const result = await licenseHexValidationService.validateLicenseHex(validationData);
    
    res.status(200).json({
      status: 'success',
      data: result
    });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Error validating license hex:', { error });
    throw new AppError(`Failed to validate license hex: ${(error as Error).message}`, 500);
  }
}); 