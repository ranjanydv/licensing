import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LicenseModel } from '../../models/license.model';
import { licenseRepository } from '../../repositories/license.repository';
import { License, LicenseStatus } from '../../interfaces/license.interface';
import { performance } from 'perf_hooks';

describe('License Repository Performance Tests', () => {
  let mongoServer: MongoMemoryServer;
  
  // Sample license data generator
  const createSampleLicense = (index: number): Partial<License> => ({
    schoolId: `school-${index}`,
    schoolName: `School ${index}`,
    licenseKey: `license-key-${index}`,
    licenseHash: `license-hash-${index}`,
    features: [
      { name: 'feature1', enabled: true },
      { name: 'feature2', enabled: index % 2 === 0 }
    ],
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + (index % 5) * 30 * 24 * 60 * 60 * 1000), // Random expiration 0-150 days
    status: index % 10 === 0 ? LicenseStatus.EXPIRED : 
            index % 15 === 0 ? LicenseStatus.REVOKED : 
            LicenseStatus.ACTIVE,
    createdBy: 'admin',
    updatedBy: 'admin'
  });
  
  beforeAll(async () => {
    // Set up MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  beforeEach(async () => {
    // Clear the database before each test
    await LicenseModel.deleteMany({});
  });
  
  // Helper function to measure execution time
  const measureExecutionTime = async (callback: () => Promise<any>): Promise<number> => {
    const start = performance.now();
    await callback();
    const end = performance.now();
    return end - start;
  };
  
  // Helper function to insert bulk test data
  const insertBulkData = async (count: number): Promise<void> => {
    const licenses = Array.from({ length: count }, (_, i) => createSampleLicense(i));
    await LicenseModel.insertMany(licenses);
  };
  
  describe('Query Performance Tests', () => {
    // Test data size
    const dataSize = 1000;
    
    beforeEach(async () => {
      // Insert test data
      await insertBulkData(dataSize);
    });
    
    test('findAll performance with and without lean', async () => {
      // Regular query
      const regularTime = await measureExecutionTime(async () => {
        await licenseRepository.findAll({}, { limit: 100 }, false);
      });
      
      // Lean query
      const leanTime = await measureExecutionTime(async () => {
        await licenseRepository.findAll({}, { limit: 100 }, true);
      });
      
      console.log(`Regular findAll: ${regularTime.toFixed(2)}ms, Lean findAll: ${leanTime.toFixed(2)}ms`);
      
      // Lean should be faster
      expect(leanTime).toBeLessThan(regularTime);
    });
    
    test('findWithPagination performance', async () => {
      const time = await measureExecutionTime(async () => {
        await licenseRepository.findWithPagination({}, 1, 20);
      });
      
      console.log(`findWithPagination: ${time.toFixed(2)}ms`);
      
      // Should be reasonably fast (adjust threshold as needed)
      expect(time).toBeLessThan(500);
    });
    
    test('findExpired performance with compound index', async () => {
      const time = await measureExecutionTime(async () => {
        await licenseRepository.findExpired();
      });
      
      console.log(`findExpired: ${time.toFixed(2)}ms`);
      
      // Should be reasonably fast with proper indexing
      expect(time).toBeLessThan(200);
    });
    
    test('findActiveBySchoolId performance with compound index', async () => {
      const time = await measureExecutionTime(async () => {
        // Test with the first 100 school IDs
        const promises = Array.from({ length: 100 }, (_, i) => 
          licenseRepository.findActiveBySchoolId(`school-${i}`, true)
        );
        await Promise.all(promises);
      });
      
      console.log(`100 findActiveBySchoolId queries: ${time.toFixed(2)}ms`);
      
      // Average time per query should be reasonable
      const avgTimePerQuery = time / 100;
      expect(avgTimePerQuery).toBeLessThan(10);
    });
    
    test('complex query performance with pagination and filtering', async () => {
      const time = await measureExecutionTime(async () => {
        await licenseRepository.findWithPagination(
          { status: LicenseStatus.ACTIVE },
          1,
          20,
          { expiresAt: 1 }, // Sort by expiration date ascending
          true // Use lean for better performance
        );
      });
      
      console.log(`Complex query with pagination: ${time.toFixed(2)}ms`);
      
      // Should be reasonably fast with proper indexing
      expect(time).toBeLessThan(200);
    });
  });
  
  describe('Index Effectiveness Tests', () => {
    // Test with larger dataset to better demonstrate index effectiveness
    const largeDataSize = 5000;
    
    beforeEach(async () => {
      // Insert larger test data set
      await insertBulkData(largeDataSize);
    });
    
    test('query with vs without using indexes', async () => {
      // Force MongoDB to use an index (status + expiresAt)
      const withIndexTime = await measureExecutionTime(async () => {
        await LicenseModel.find({
          status: LicenseStatus.ACTIVE,
          expiresAt: { $gt: new Date() }
        }).exec();
      });
      
      // Force MongoDB to not use an index (using $where which can't use indexes)
      const withoutIndexTime = await measureExecutionTime(async () => {
        await LicenseModel.find({
          $where: function() {
            return this.status === LicenseStatus.ACTIVE && this.expiresAt > new Date();
          }
        }).exec();
      });
      
      console.log(`Query with index: ${withIndexTime.toFixed(2)}ms, without index: ${withoutIndexTime.toFixed(2)}ms`);
      
      // Query with index should be significantly faster
      expect(withIndexTime).toBeLessThan(withoutIndexTime * 0.5); // At least 2x faster
    });
  });
});