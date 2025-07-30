import { ActivationStatus, HexValidationRequest, HexValidationResponse } from '../interfaces/license.interface';
import { licenseRepository } from '../repositories/license.repository';
import { validateLicenseHex } from '../utils/licenseHexGenerator';
import { Logger } from '../utils/logger';

const logger = new Logger('LicenseHexValidationService');

export class LicenseHexValidationService {
  /**
   * Validate a license hex for school ERP
   * @param validationRequest Hex validation request
   * @returns Validation response
   */
  async validateLicenseHex(validationRequest: HexValidationRequest): Promise<HexValidationResponse> {
    try {
      const { licenseHex, schoolId } = validationRequest;
      
      logger.info('Validating license hex', { 
        hex: licenseHex.substring(0, 16) + '...', 
        schoolId 
      });
      
      // Find license by hex
      const license = await licenseRepository.findByLicenseHex(licenseHex);
      if (!license) {
        return {
          valid: false,
          message: 'Invalid license hex'
        };
      }
      
      // Check if license is activated
      if (license.activationStatus !== ActivationStatus.ACTIVATED) {
        return {
          valid: false,
          message: 'License not activated'
        };
      }
      
      // Verify school ID matches
      if (license.schoolId !== schoolId) {
        return {
          valid: false,
          message: 'School ID does not match'
        };
      }
      
      // Check if license has expired
      if (license.expiresAt < new Date()) {
        // Update license status to expired
        await licenseRepository.update(license._id.toString(), {
          activationStatus: ActivationStatus.EXPIRED
        });
        
        return {
          valid: false,
          message: 'License has expired'
        };
      }
      
      // Validate hex format and integrity
      if (!validateLicenseHex(licenseHex, license)) {
        return {
          valid: false,
          message: 'Invalid license hex format'
        };
      }
      
      // Update last verification timestamp
      await licenseRepository.update(license._id.toString(), {
        lastVerificationAt: new Date()
      });
      
      // Calculate days until expiration
      const now = new Date();
      const expiresAt = license.expiresAt;
      const daysUntilExpiration = Math.ceil(
        (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      logger.info('License hex validated successfully', { 
        licenseId: license._id, 
        schoolId,
        daysUntilExpiration
      });
      
      return {
        valid: true,
        expiresIn: daysUntilExpiration,
        features: license.features.filter(f => f.enabled).map(f => f.name),
        message: 'License is valid'
      };
      
    } catch (error) {
      logger.error('Error validating license hex:', { error });
      return {
        valid: false,
        message: 'Validation failed'
      };
    }
  }
}

export const licenseHexValidationService = new LicenseHexValidationService(); 