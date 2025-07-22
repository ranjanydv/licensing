import request from 'supertest';
import express from 'express';
import { licenseService } from '../../services/license.service';
import { LicenseStatus } from '../../interfaces/license.interface';
import licenseRoutes from '../../routes/licenseRoutes';
import { errorHandler } from '../../middlewares/errorHandler';

// Mock the license service
jest.mock('../../services/license.service');

// Mock the validation utility
jest.mock('../../utils/validation', () => ({
  validate: jest.fn((schema, data) => data),
  licenseRequestSchema: {},
  licenseUpdateSchema: {},
  licenseValidationSchema: {}
}));

describe('License Management Integration Tests', () => {
  let app: express.Application;
  
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
    app = express();
    app.use(express.json());
    app.use('/api/licenses', licenseRoutes);
    app.use(errorHandler);
    
    jest.clearAllMocks();
  });
  
  describe('GET /api/licenses', () => {
    it('should get all licenses', async () => {
      // Mock license service
      (licenseService.getAllLicenses as jest.Mock).mockResolvedValue([sampleLicense]);
      
      // Make request
      const response = await request(app).get('/api/licenses');
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        results: 1,
        data: {
          licenses: [expect.objectContaining({ _id: 'license123' })]
        }
      });
    });
    
    it('should filter licenses by query parameters', async () => {
      // Mock license service
      (licenseService.getAllLicenses as jest.Mock).mockResolvedValue([sampleLicense]);
      
      // Make request with query parameters
      const response = await request(app)
        .get('/api/licenses')
        .query({ status: LicenseStatus.ACTIVE, schoolId: 'school123' });
      
      // Verify service was called with filter
      expect(licenseService.getAllLicenses).toHaveBeenCalledWith({
        status: LicenseStatus.ACTIVE,
        schoolId: 'school123'
      });
      
      // Verify response
      expect(response.status).toBe(200);
    });
  });
  
  describe('GET /api/licenses/:id', () => {
    it('should get a license by ID', async () => {
      // Mock license service
      (licenseService.getLicense as jest.Mock).mockResolvedValue(sampleLicense);
      
      // Make request
      const response = await request(app).get('/api/licenses/license123');
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          license: expect.objectContaining({ _id: 'license123' })
        }
      });
      
      // Verify service was called
      expect(licenseService.getLicense).toHaveBeenCalledWith('license123');
    });
    
    it('should return 404 for non-existent license', async () => {
      // Mock license service
      (licenseService.getLicense as jest.Mock).mockResolvedValue(null);
      
      // Make request
      const response = await request(app).get('/api/licenses/non-existent-id');
      
      // Verify response
      expect(response.status).toBe(404);
      expect(response.body).toEqual(expect.objectContaining({
        status: 'error'
      }));
    });
  });
  
  describe('PUT /api/licenses/:id', () => {
    it('should update a license', async () => {
      // Mock license service
      const updatedLicense = {
        ...sampleLicense,
        schoolName: 'Updated School Name',
        features: [
          { name: 'feature1', enabled: true },
          { name: 'feature2', enabled: true }
        ]
      };
      (licenseService.updateLicense as jest.Mock).mockResolvedValue(updatedLicense);
      
      // Make request
      const response = await request(app)
        .put('/api/licenses/license123')
        .send({
          schoolName: 'Updated School Name',
          features: [
            { name: 'feature1', enabled: true },
            { name: 'feature2', enabled: true }
          ],
          userId: 'admin'
        });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: {
          license: expect.objectContaining({
            _id: 'license123',
            schoolName: 'Updated School Name'
          })
        }
      });
    });
    
    it('should return 404 for non-existent license', async () => {
      // Mock license service
      (licenseService.updateLicense as jest.Mock).mockResolvedValue(null);
      
      // Make request
      const response = await request(app)
        .put('/api/licenses/non-existent-id')
        .send({
          schoolName: 'Updated School Name',
          userId: 'admin'
        });
      
      // Verify response
      expect(response.status).toBe(404);
    });
  });
  
  describe('DELETE /api/licenses/:id', () => {
    it('should revoke a license', async () => {
      // Mock license service
      (licenseService.revokeLicense as jest.Mock).mockResolvedValue(true);
      
      // Make request
      const response = await request(app)
        .delete('/api/licenses/license123')
        .send({ userId: 'admin' });
      
      // Verify response
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'License revoked successfully'
      });
      
      // Verify service was called
      expect(licenseService.revokeLicense).toHaveBeenCalledWith('license123', 'admin');
    });
    
    it('should return 404 for non-existent license', async () => {
      // Mock license service
      (licenseService.revokeLicense as jest.Mock).mockResolvedValue(false);
      
      // Make request
      const response = await request(app)
        .delete('/api/licenses/non-existent-id')
        .send({ userId: 'admin' });
      
      // Verify response
      expect(response.status).toBe(404);
    });
  });
});