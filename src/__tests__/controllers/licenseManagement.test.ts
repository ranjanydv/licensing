import { Request, Response } from 'express';
import { 
  getLicenses, 
  getLicenseById, 
  updateLicense, 
  revokeLicense 
} from '../../controllers/licenseController';
import { licenseService } from '../../services/license.service';
import { LicenseStatus } from '../../interfaces/license.interface';
import { LicenseError } from '../../middlewares/errorHandler';

// Mock the license service
jest.mock('../../services/license.service');

// Mock the validation utility
jest.mock('../../utils/validation', () => ({
  validate: jest.fn((schema, data) => data),
  licenseRequestSchema: {},
  licenseUpdateSchema: {},
  licenseValidationSchema: {}
}));

describe('License Management Controllers', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;
  
  // Sample license data
  const sampleLicense = {
    _id: 'license123',
    schoolId: 'school123',
    schoolName: 'Test School',
    licenseKey: 'license-key-123',
    licenseHash: 'hash-value-123',
    features: [
      { name: 'feature1', enabled: true },
      { name: 'feature2', enabled: false }
    ],
    issuedAt: new Date('2023-01-01'),
    expiresAt: new Date('2024-01-01'),
    lastChecked: new Date(),
    status: LicenseStatus.ACTIVE,
    metadata: { plan: 'premium' },
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    mockNext = jest.fn();
    
    jest.clearAllMocks();
  });
  
  describe('getLicenses', () => {
    it('should get all licenses', async () => {
      // Mock license service
      (licenseService.getAllLicenses as jest.Mock).mockResolvedValue([sampleLicense]);
      
      // Call controller
      await getLicenses(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        results: 1,
        data: {
          licenses: [sampleLicense]
        }
      });
      
      // Verify service was called
      expect(licenseService.getAllLicenses).toHaveBeenCalledWith({});
    });
    
    it('should filter licenses by query parameters', async () => {
      // Mock request query
      mockRequest.query = {
        status: LicenseStatus.ACTIVE,
        schoolId: 'school123'
      };
      
      // Mock license service
      (licenseService.getAllLicenses as jest.Mock).mockResolvedValue([sampleLicense]);
      
      // Call controller
      await getLicenses(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify service was called with filter
      expect(licenseService.getAllLicenses).toHaveBeenCalledWith({
        status: LicenseStatus.ACTIVE,
        schoolId: 'school123'
      });
    });
  });
  
  describe('getLicenseById', () => {
    it('should get a license by ID', async () => {
      // Mock request params
      mockRequest.params = {
        id: 'license123'
      };
      
      // Mock license service
      (licenseService.getLicense as jest.Mock).mockResolvedValue(sampleLicense);
      
      // Call controller
      await getLicenseById(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          license: sampleLicense
        }
      });
      
      // Verify service was called
      expect(licenseService.getLicense).toHaveBeenCalledWith('license123');
    });
    
    it('should return 404 for non-existent license', async () => {
      // Mock request params
      mockRequest.params = {
        id: 'non-existent-id'
      };
      
      // Mock license service
      (licenseService.getLicense as jest.Mock).mockResolvedValue(null);
      
      // Call controller
      await getLicenseById(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(expect.any(LicenseError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
    });
  });
  
  describe('updateLicense', () => {
    it('should update a license', async () => {
      // Mock request params and body
      mockRequest.params = {
        id: 'license123'
      };
      mockRequest.body = {
        schoolName: 'Updated School Name',
        features: [
          { name: 'feature1', enabled: true },
          { name: 'feature2', enabled: true }
        ],
        userId: 'admin'
      };
      
      // Mock license service
      const updatedLicense = {
        ...sampleLicense,
        schoolName: 'Updated School Name',
        features: [
          { name: 'feature1', enabled: true },
          { name: 'feature2', enabled: true }
        ],
        updatedBy: 'admin'
      };
      (licenseService.updateLicense as jest.Mock).mockResolvedValue(updatedLicense);
      
      // Call controller
      await updateLicense(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          license: updatedLicense
        }
      });
      
      // Verify service was called
      expect(licenseService.updateLicense).toHaveBeenCalledWith(
        'license123',
        mockRequest.body,
        'admin'
      );
    });
    
    it('should return 404 for non-existent license', async () => {
      // Mock request params and body
      mockRequest.params = {
        id: 'non-existent-id'
      };
      mockRequest.body = {
        schoolName: 'Updated School Name',
        userId: 'admin'
      };
      
      // Mock license service
      (licenseService.updateLicense as jest.Mock).mockResolvedValue(null);
      
      // Call controller
      await updateLicense(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(expect.any(LicenseError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
    });
  });
  
  describe('revokeLicense', () => {
    it('should revoke a license', async () => {
      // Mock request params and body
      mockRequest.params = {
        id: 'license123'
      };
      mockRequest.body = {
        userId: 'admin'
      };
      
      // Mock license service
      (licenseService.revokeLicense as jest.Mock).mockResolvedValue(true);
      
      // Call controller
      await revokeLicense(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'License revoked successfully'
      });
      
      // Verify service was called
      expect(licenseService.revokeLicense).toHaveBeenCalledWith('license123', 'admin');
    });
    
    it('should return 404 for non-existent license', async () => {
      // Mock request params and body
      mockRequest.params = {
        id: 'non-existent-id'
      };
      mockRequest.body = {
        userId: 'admin'
      };
      
      // Mock license service
      (licenseService.revokeLicense as jest.Mock).mockResolvedValue(false);
      
      // Call controller
      await revokeLicense(mockRequest as Request, mockResponse as Response, mockNext);
      
      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(expect.any(LicenseError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(404);
    });
  });
});