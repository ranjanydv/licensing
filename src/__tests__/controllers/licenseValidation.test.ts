import { Request, Response } from 'express';
import { validateLicense } from '../../controllers/licenseController';
import { licenseService } from '../../services/license.service';
import { LicenseStatus } from '../../interfaces/license.interface';

// Mock the license service
jest.mock('../../services/license.service');

// Mock the validation utility
jest.mock('../../utils/validation', () => ({
	validate: jest.fn((schema, data) => data),
	licenseValidationSchema: {}
}));

describe('License Validation Controller', () => {
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
					{ name: 'feature2', enabled: false },
					{ name: 'feature3', enabled: true }
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
					features: ['feature1', 'feature3'] // Only enabled features
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

		it('should return error for revoked license', async () => {
			// Mock request body
			mockRequest.body = {
				licenseKey: 'revoked-license-key',
				schoolId: 'school123'
			};

			// Mock license service
			(licenseService.validateLicense as jest.Mock).mockResolvedValue({
				valid: false,
				errors: [`License is ${LicenseStatus.REVOKED}`]
			});

			// Call controller
			await validateLicense(mockRequest as Request, mockResponse as Response, mockNext);

			// Verify response
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'error',
				data: {
					valid: false,
					errors: [`License is ${LicenseStatus.REVOKED}`]
				}
			});
		});

		it('should return error for license with mismatched school ID', async () => {
			// Mock request body
			mockRequest.body = {
				licenseKey: 'valid-license-key',
				schoolId: 'wrong-school'
			};

			// Mock license service
			(licenseService.validateLicense as jest.Mock).mockResolvedValue({
				valid: false,
				errors: ['License does not match school ID']
			});

			// Call controller
			await validateLicense(mockRequest as Request, mockResponse as Response, mockNext);

			// Verify response
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'error',
				data: {
					valid: false,
					errors: ['License does not match school ID']
				}
			});
		});

		it('should return error for invalid JWT token', async () => {
			// Mock request body
			mockRequest.body = {
				licenseKey: 'invalid-jwt-token',
				schoolId: 'school123'
			};

			// Mock license service
			(licenseService.validateLicense as jest.Mock).mockResolvedValue({
				valid: false,
				errors: ['Invalid license token']
			});

			// Call controller
			await validateLicense(mockRequest as Request, mockResponse as Response, mockNext);

			// Verify response
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'error',
				data: {
					valid: false,
					errors: ['Invalid license token']
				}
			});
		});

		it('should handle multiple validation errors', async () => {
			// Mock request body
			mockRequest.body = {
				licenseKey: 'invalid-license-key',
				schoolId: 'school123'
			};

			// Mock license service with multiple errors
			(licenseService.validateLicense as jest.Mock).mockResolvedValue({
				valid: false,
				errors: ['License has expired', 'License hash verification failed']
			});

			// Call controller
			await validateLicense(mockRequest as Request, mockResponse as Response, mockNext);

			// Verify response
			expect(mockResponse.status).toHaveBeenCalledWith(401);
			expect(mockResponse.json).toHaveBeenCalledWith({
				status: 'error',
				data: {
					valid: false,
					errors: ['License has expired', 'License hash verification failed']
				}
			});
		});
	});
});