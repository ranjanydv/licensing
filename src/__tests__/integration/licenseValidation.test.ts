import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../index';
import { licenseService } from '../../services/license.service';
import { LicenseStatus } from '../../interfaces/license.interface';

// Mock the license service
jest.mock('../../services/license.service');

describe('License Validation API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
  });
  
  describe('POST /api/licenses/validate', () => {
    it('should validate a valid license', async () => {
      // Mock license service
      const mockLicense = {
        _id: 'license123',
        schoolId: 'school123',
        schoolName: 'Test School',
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
      
      // Make request
      const response = await request(app)
        .post('/api/licenses/validate')
        .send({
          licenseKey: 'valid-license-key',
          schoolId: 'school123'
        });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.expiresIn).toBe(30);
      expect(response.body.data.features).toContain('feature1');
      expect(response.body.data.features).not.toContain('feature2');
      
      // Verify service was called
      expect(licenseService.validateLicense).toHaveBeenCalledWith(
        'valid-license-key',
        'school123'
      );
    });
    
    it('should return 401 for invalid license', async () => {
      // Mock license service
      (licenseService.validateLicense as jest.Mock).mockResolvedValue({
        valid: false,
        errors: ['License has expired']
      });
      
      // Make request
      const response = await request(app)
        .post('/api/licenses/validate')
        .send({
          licenseKey: 'invalid-license-key',
          schoolId: 'school123'
        });
      
      // Verify response
      expect(response.status).toBe(401);
      expect(response.body.status).toBe('error');
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors).toContain('License has expired');
    });
    
    it('should return 400 for missing required fields', async () => {
      // Make request with missing fields
      const response = await request(app)
        .post('/api/licenses/validate')
        .send({
          licenseKey: 'valid-license-key'
          // Missing schoolId
        });
      
      // Verify response
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
    });
  });
});