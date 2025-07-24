import request from 'supertest';
import express from 'express';
import { authLimiter, apiLimiter } from '../../middlewares/rateLimiter';
import { errorHandler } from '../../middlewares/errorHandler';

describe('Rate Limiter Middleware', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(errorHandler);
  });

  describe('authLimiter', () => {
    beforeEach(() => {
      // Create a test route with auth limiter
      app.post('/test-auth', authLimiter, (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
    });

    it('should allow requests within the rate limit', async () => {
      // Make a request
      const res = await request(app).post('/test-auth');
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Success');
    });

    it('should include rate limit headers', async () => {
      // Make a request
      const res = await request(app).post('/test-auth');
      
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
      expect(res.headers).toHaveProperty('ratelimit-reset');
    });
  });

  describe('apiLimiter', () => {
    beforeEach(() => {
      // Create a test route with API limiter
      app.get('/test-api', apiLimiter, (req, res) => {
        res.status(200).json({ message: 'Success' });
      });
    });

    it('should allow requests within the rate limit', async () => {
      // Make a request
      const res = await request(app).get('/test-api');
      
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Success');
    });

    it('should include rate limit headers', async () => {
      // Make a request
      const res = await request(app).get('/test-api');
      
      expect(res.headers).toHaveProperty('ratelimit-limit');
      expect(res.headers).toHaveProperty('ratelimit-remaining');
      expect(res.headers).toHaveProperty('ratelimit-reset');
    });
  });

  // Note: Testing the actual rate limiting behavior (429 responses) would require
  // making many requests in quick succession, which is not ideal for unit tests.
  // This would be better tested in a dedicated performance or load test.
});