import { licenseService } from '../../services/license.service';
import { LicenseRequest } from '../../interfaces/license.interface';
import { performance } from 'perf_hooks';

describe('License Validation Performance Tests', () => {
  // Sample license data
  const licenseData: LicenseRequest = {
    schoolId: '12345',
    schoolName: 'Test School',
    duration: 365,
    features: [
      { name: 'attendance', enabled: true },
      { name: 'gradebook', enabled: true },
      { name: 'reports', enabled: true },
      { name: 'communication', enabled: true },
      { name: 'finance', enabled: true }
    ],
    createdBy: 'test-user'
  };
  
  let license: any;
  
  beforeAll(async () => {
    // Generate a license for testing
    license = await licenseService.generateLicense(licenseData);
  });
  
  // Test license validation performance
  test('should validate licenses within acceptable time', async () => {
    const iterations = 100;
    const times: number[] = [];
    
    // Run multiple iterations
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await licenseService.validateLicense(license.licenseKey, licenseData.schoolId);
      const end = performance.now();
      times.push(end - start);
    }
    
    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const maxTime = Math.max(...times);
    
    // Log performance metrics
    console.log(`License validation performance (${iterations} iterations):`);
    console.log(`Average time: ${averageTime.toFixed(2)}ms`);
    console.log(`Maximum time: ${maxTime.toFixed(2)}ms`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    
    // Assert performance requirements
    expect(averageTime).toBeLessThan(50); // Average should be under 50ms
    expect(maxTime).toBeLessThan(100);    // Max should be under 100ms
  });
  
  // Test license generation performance
  test('should generate licenses within acceptable time', async () => {
    const iterations = 10;
    const times: number[] = [];
    
    // Run multiple iterations
    for (let i = 0; i < iterations; i++) {
      const customData = {
        ...licenseData,
        schoolId: `school-${i}`,
        schoolName: `School ${i}`
      };
      
      const start = performance.now();
      await licenseService.generateLicense(customData);
      const end = performance.now();
      times.push(end - start);
    }
    
    // Calculate statistics
    const totalTime = times.reduce((sum, time) => sum + time, 0);
    const averageTime = totalTime / iterations;
    const maxTime = Math.max(...times);
    
    // Log performance metrics
    console.log(`License generation performance (${iterations} iterations):`);
    console.log(`Average time: ${averageTime.toFixed(2)}ms`);
    console.log(`Maximum time: ${maxTime.toFixed(2)}ms`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    
    // Assert performance requirements
    expect(averageTime).toBeLessThan(200); // Average should be under 200ms
    expect(maxTime).toBeLessThan(300);     // Max should be under 300ms
  });
  
  // Test concurrent license validations
  test('should handle concurrent license validations efficiently', async () => {
    const concurrentRequests = 50;
    
    const start = performance.now();
    
    // Create array of promises for concurrent validation
    const promises = Array(concurrentRequests).fill(0).map(() => 
      licenseService.validateLicense(license.licenseKey, licenseData.schoolId)
    );
    
    // Wait for all validations to complete
    const results = await Promise.all(promises);
    
    const end = performance.now();
    const totalTime = end - start;
    
    // Log performance metrics
    console.log(`Concurrent license validation (${concurrentRequests} concurrent requests):`);
    console.log(`Total time: ${totalTime.toFixed(2)}ms`);
    console.log(`Average time per request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);
    
    // All validations should be successful
    expect(results.every(result => result.valid)).toBe(true);
    
    // Assert performance requirements for concurrent requests
    expect(totalTime).toBeLessThan(concurrentRequests * 20); // Should be faster than sequential
  });
});