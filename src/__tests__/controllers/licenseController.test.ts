import { Request, Response } from 'express';
import { generateLicense, validateLicense } from '../../controllers/licenseController';
import { licenseService } from '../../services/license.service';
import { LicenseStatus } from '../../interfaces/license.interface';
import { AppError, LicenseError } from '../../middlewares/errorHandler';

// Mock the license service
jest.mock('../../services/license.service');

// Mock the validation utility
jest.mock('../../utils/validation', () => ({
  validate: jest.fn((schema, data) => data),
  licenseRequestSchema: {},
  licenseUpdateSchema: {},
  licenseValidationSchema: {}
}));

describe('License Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: jest.Mock;

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

  describe('generateLicense', () => {
    it('should generate a license and return 201 status', async () => {
      // Mock request body
      mockRequest.body = {
        schoolId: 'school123',
        schoolName: 'Test School',
        duration: 365,
        features: [
          { name: 'feature1', enabled: true },
          { name: 'feature2', enabled: false }
        ],
        createdBy: 'admin'
      };

      // Mock license service
      const mockLicense = {
        _id: 'license123',
        ...mockRequest.body,
        licenseKey: 'mock-license-key',
        licenseHash: 'mock-license-hash',
        issuedAt: new Date(),
        expiresAt: new Date(),
        lastChecked: new Date(),
        status: LicenseStatus.ACTIVE,
        metadata: {},
        updatedBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      (licenseService.generateLicense as jest.Mock).mockResolvedValue(mockLicense);

      // Call controller
      await generateLicense(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          license: mockLicense
        }
      });

      // Verify service was called
      expect(licenseService.generateLicense).toHaveBeenCalledWith(mockRequest.body);
    });

    it('should set createdBy if not provided', async () => {
      // Mock request body without createdBy
      mockRequest.body = {
        schoolId: 'school123',
        schoolName: 'Test School',
        duration: 365,
        features: [
          { name: 'feature1', enabled: true }
        ],
        userId: 'user123' // From authentication middleware
      };

      // Mock license service
      (licenseService.generateLicense as jest.Mock).mockResolvedValue({
        _id: 'license123',
        ...mockRequest.body,
        createdBy: 'user123'
      });

      // Call controller
      await generateLicense(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify service was called with createdBy set
      expect(licenseService.generateLicense).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: 'user123'
        })
      );
    });

    it('should handle LicenseError and pass it to next middleware', async () => {
      // Mock request body
      mockRequest.body = {
        schoolId: 'school123',
        schoolName: 'Test School',
        duration: 365,
        features: []
      };

      // Mock license service to throw LicenseError
      const licenseError = new LicenseError('School already has an active license', 'LICENSE_ALREADY_EXISTS', 409);
      (licenseService.generateLicense as jest.Mock).mockRejectedValue(licenseError);

      // Call controller
      await generateLicense(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify next was called with error
      expect(mockNext).toHaveBeenCalledWith(licenseError);
    });

    it('should handle other errors and convert to AppError', async () => {
      // Mock request body
      mockRequest.body = {
        schoolId: 'school123',
        schoolName: 'Test School',
        duration: 365,
        features: []
      };

      // Mock license service to throw generic error
      const genericError = new Error('Something went wrong');
      (licenseService.generateLicense as jest.Mock).mockRejectedValue(genericError);

      // Call controller
      await generateLicense(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify next was called with AppError
      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
    });
  });

  describe('validateLicense', () => {
    it('should validate a license and return success for valid license', async () => {
      // Mock request body
      mockRequest.body = {
        licenseKey: 'valid-license-key',
        schoolId: 'school123'
      };

      // Mock license service
      const mockLicense = {
        _id: 'license123',
        schoolId: 'school123',
        features: [
          { name: 'feature1', enabled: true },
          { name: 'feature2', enabled: false }
        ],
        status: LicenseStatus.ACTIVE
      };
      (licenseService.validateLicense as jest.Mock).mockResolvedValue({
        valid: true,
        license: mockLicense,
        expiresIn: 30
      });

      // Call controller
      await validateLicense(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          valid: true,
          expiresIn: 30,
          features: ['feature1'] // Only enabled features
        }
      });

      // Verify service was called
      expect(licenseService.validateLicense).toHaveBeenCalledWith(
        mockRequest.body.licenseKey,
        mockRequest.body.schoolId
      );
    });

    it('should return error for invalid license', async () => {
      // Mock request body
      mockRequest.body = {
        licenseKey: 'invalid-license-key',
        schoolId: 'school123'
      };

      // Mock license service
      (licenseService.validateLicense as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['License has expired']
      });

      // Call controller
      await validateLicense(mockRequest as Request, mockResponse as Response, mockNext);

      // Verify response
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        data: {
          valid: false,
          errors: ['License has expired']
        }
      });
    });
  });
});