import { Request, Response, NextFunction } from 'express';
import { licenseService } from '../services/license.service';
import { Logger } from '../utils/logger';
import { AppError, LicenseError } from '../middlewares/errorHandler';

const logger = new Logger('FeatureController');

/**
 * Feature controller for handling feature validation requests
 */
export class FeatureController {
  /**
   * Check if a license has a specific feature
   * @param req Request
   * @param res Response
   * @param next NextFunction
   */
  async hasFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { licenseId, featureName } = req.params;
      
      if (!licenseId || !featureName) {
        throw new AppError('License ID and feature name are required', 400);
      }
      
      const license = await licenseService.getLicense(licenseId);
      
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }
      
      const hasFeature = licenseService.hasFeature(license, featureName);
      
      res.status(200).json({
        success: true,
        data: {
          hasFeature
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Validate a feature against its restrictions
   * @param req Request
   * @param res Response
   * @param next NextFunction
   */
  async validateFeature(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { licenseId, featureName } = req.params;
      const context = req.body.context || {};
      
      if (!licenseId || !featureName) {
        throw new AppError('License ID and feature name are required', 400);
      }
      
      const license = await licenseService.getLicense(licenseId);
      
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }
      
      const validationResult = licenseService.validateFeature(license, featureName, context);
      
      res.status(200).json({
        success: true,
        data: validationResult
      });
    } catch (error) {
      next(error);
    }
  }
  
  /**
   * Validate multiple features against their restrictions
   * @param req Request
   * @param res Response
   * @param next NextFunction
   */
  async validateFeatures(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { licenseId } = req.params;
      const { features, context } = req.body;
      
      if (!licenseId || !features || !Array.isArray(features)) {
        throw new AppError('License ID and features array are required', 400);
      }
      
      const license = await licenseService.getLicense(licenseId);
      
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }
      
      const validationResults = licenseService.validateFeatures(license, features, context || {});
      
      res.status(200).json({
        success: true,
        data: validationResults
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const featureController = new FeatureController();

export default featureController;