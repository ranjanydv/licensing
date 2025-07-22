import { Request, Response, NextFunction } from 'express';
import { featureController } from '../../controllers/feature.controller';
import { licenseService } from '../../services/license.service';
import { License, LicenseStatus } from '../../interfaces/license.interface';
import { FeatureValidationResult } from '../../utils/featureValidation';

// Mock license service
jest.mock('../../services/license.service', () => ({
  licenseService: {
    getLicense: jest.fn(),
    hasFeature: jest.fn(),
    validateFeature: jest.fn(),
    validateFeatures: jest.fn()
  }
}));

describe('Feature Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  
  // Sample license for testing
  const sampleLicense: License = {
    _id: '123456789',
    schoolId: 'school123',
    schoolName: 'Test School',
    licenseKey: 'test-license-key',
    licenseHash: 'test-license-hash',
    features: [
      {
        name: 'test-feature',
        enabled: true,
        restrictions: {
          maxUsers: 10
        }
      }
    ],
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    lastChecked: new Date(),
    status: LicenseStatus.ACTIVE,
    metadata: {},
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Sample validation result
  const sampleValidationResult: FeatureValidationResult = {
    isValid: true,
    feature: 'test-feature'
  };
  
  beforeEach(() => {
    mockRequest = {
      params: {},
      body: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
    
    // Reset mocks
    jest.clearAllMocks();
  });
  
  describe('hasFeature', () => {
    it('should return true when feature exists and is enabled', async () => {
      // Setup
      mockRequest.params = {
        licenseId: '123456789',
        featureName: 'test-feature'
      };
      
      (licenseService.getLicense as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseService.hasFeature as jest.Mock).mockReturnValue(true);
      
      // Execute
      await featureController.hasFeature(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).toHaveBeenCalledWith('123456789');
      expect(licenseService.hasFeature).toHaveBeenCalledWith(sampleLicense, 'test-feature');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hasFeature: true
        }
      });
    });
    
    it('should return false when feature does not exist or is disabled', async () => {
      // Setup
      mockRequest.params = {
        licenseId: '123456789',
        featureName: 'non-existent-feature'
      };
      
      (licenseService.getLicense as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseService.hasFeature as jest.Mock).mockReturnValue(false);
      
      // Execute
      await featureController.hasFeature(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).toHaveBeenCalledWith('123456789');
      expect(licenseService.hasFeature).toHaveBeenCalledWith(sampleLicense, 'non-existent-feature');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          hasFeature: false
        }
      });
    });
    
    it('should call next with error when license is not found', async () => {
      // Setup
      mockRequest.params = {
        licenseId: 'invalid-id',
        featureName: 'test-feature'
      };
      
      (licenseService.getLicense as jest.Mock).mockResolvedValue(null);
      
      // Execute
      await featureController.hasFeature(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).toHaveBeenCalledWith('invalid-id');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
    
    it('should call next with error when parameters are missing', async () => {
      // Setup
      mockRequest.params = {
        licenseId: '123456789'
        // Missing featureName
      };
      
      // Execute
      await featureController.hasFeature(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
  
  describe('validateFeature', () => {
    it('should return validation result when feature is valid', async () => {
      // Setup
      mockRequest.params = {
        licenseId: '123456789',
        featureName: 'test-feature'
      };
      mockRequest.body = {
        context: {
          maxUsers: 5
        }
      };
      
      (licenseService.getLicense as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseService.validateFeature as jest.Mock).mockReturnValue(sampleValidationResult);
      
      // Execute
      await featureController.validateFeature(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).toHaveBeenCalledWith('123456789');
      expect(licenseService.validateFeature).toHaveBeenCalledWith(
        sampleLicense,
        'test-feature',
        { maxUsers: 5 }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: sampleValidationResult
      });
    });
    
    it('should handle empty context', async () => {
      // Setup
      mockRequest.params = {
        licenseId: '123456789',
        featureName: 'test-feature'
      };
      mockRequest.body = {}; // No context
      
      (licenseService.getLicense as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseService.validateFeature as jest.Mock).mockReturnValue(sampleValidationResult);
      
      // Execute
      await featureController.validateFeature(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).toHaveBeenCalledWith('123456789');
      expect(licenseService.validateFeature).toHaveBeenCalledWith(
        sampleLicense,
        'test-feature',
        {}
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: sampleValidationResult
      });
    });
    
    it('should call next with error when license is not found', async () => {
      // Setup
      mockRequest.params = {
        licenseId: 'invalid-id',
        featureName: 'test-feature'
      };
      
      (licenseService.getLicense as jest.Mock).mockResolvedValue(null);
      
      // Execute
      await featureController.validateFeature(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).toHaveBeenCalledWith('invalid-id');
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
  
  describe('validateFeatures', () => {
    it('should return validation results for multiple features', async () => {
      // Setup
      mockRequest.params = {
        licenseId: '123456789'
      };
      mockRequest.body = {
        features: ['test-feature', 'another-feature'],
        context: {
          maxUsers: 5
        }
      };
      
      (licenseService.getLicense as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseService.validateFeatures as jest.Mock).mockReturnValue([
        sampleValidationResult,
        { isValid: false, feature: 'another-feature', message: 'Feature not found' }
      ]);
      
      // Execute
      await featureController.validateFeatures(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).toHaveBeenCalledWith('123456789');
      expect(licenseService.validateFeatures).toHaveBeenCalledWith(
        sampleLicense,
        ['test-feature', 'another-feature'],
        { maxUsers: 5 }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: [
          sampleValidationResult,
          { isValid: false, feature: 'another-feature', message: 'Feature not found' }
        ]
      });
    });
    
    it('should call next with error when features array is missing', async () => {
      // Setup
      mockRequest.params = {
        licenseId: '123456789'
      };
      mockRequest.body = {
        // Missing features array
        context: {
          maxUsers: 5
        }
      };
      
      // Execute
      await featureController.validateFeatures(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );
      
      // Assert
      expect(licenseService.getLicense).not.toHaveBeenCalled();
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();
    });
  });
});