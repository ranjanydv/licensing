import request from 'supertest';
import express from 'express';
import { licenseValidationLimiter } from '../../middlewares/rateLimiter';

describe('Rate Limiting Security Tests', () => {
  // Create a test app with rate limiting
  const app = express();
  app.use('/test', licenseValidationLimiter);
  app.get('/test', (req, res) => res.status(200).json({ success: true }));
  
  // Test for rate limiting
  test('should limit requests according to configuration', async () => {
    // Get the max requests from the limiter (default is usually 100)
    const maxRequests = 10; // Adjust based on your actual configuration
    
    // Make requests up to the limit
    const responses = [];
    for (let i = 0; i < maxRequests; i++) {
      const response = await request(app).get('/test');
      responses.push(response.status);
    }
    
    // All requests should succeed
    expect(responses.every(status => status === 200)).toBe(true);
    
    // The next request should be rate limited
    const limitedResponse = await request(app).get('/test');
    expect(limitedResponse.status).toBe(429);
  });
  
  // Test for rate limit headers
  test('should include rate limit headers in responses', async () => {
    const response = await request(app).get('/test');
    
    // Check for rate limit headers
    expect(response.headers).toHaveProperty('x-ratelimit-limit');
    expect(response.headers).toHaveProperty('x-ratelimit-remaining');
    expect(response.headers).toHaveProperty('x-ratelimit-reset');
    
    // Remaining should be a number
    expect(Number(response.headers['x-ratelimit-remaining'])).not.toBeNaN();
  });
});