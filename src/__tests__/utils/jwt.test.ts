import { generateToken, verifyToken, decodeToken } from '../../utils/jwt';
import { JWTPayload } from '../../interfaces/license.interface';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middlewares/errorHandler';

// Mock environment variables
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.JWT_EXPIRES_IN = '1h';

describe('JWT Utilities', () => {
  const mockPayload: JWTPayload = {
    sub: 'school123',
    iss: 'license-management-system',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
    schoolName: 'Test School',
    features: ['feature1', 'feature2'],
    licenseId: '12345',
    metadata: { plan: 'premium' }
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      // Verify the token can be decoded
      const decoded = jwt.decode(token) as JWTPayload;
      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.schoolName).toBe(mockPayload.schoolName);
    });

    it('should throw an error if JWT_SECRET is not defined', () => {
      const originalSecret = process.env.JWT_SECRET;
      delete process.env.JWT_SECRET;
      
      expect(() => generateToken(mockPayload)).toThrow();
      
      // Restore the environment variable
      process.env.JWT_SECRET = originalSecret;
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(mockPayload);
      const decoded = verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.sub).toBe(mockPayload.sub);
      expect(decoded.schoolName).toBe(mockPayload.schoolName);
    });

    it('should throw an error for an invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyToken(invalidToken)).toThrow(AppError);
    });

    it('should throw an error for an expired token', () => {
      // Create a payload with an expiration in the past
      const expiredPayload = {
        ...mockPayload,
        exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
      };
      
      // Sign the token manually to bypass the expiration check in generateToken
      const expiredToken = jwt.sign(expiredPayload, process.env.JWT_SECRET!);
      
      expect(() => verifyToken(expiredToken)).toThrow(AppError);
    });
  });

  describe('decodeToken', () => {
    it('should decode a valid token without verification', () => {
      const token = generateToken(mockPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe(mockPayload.sub);
      expect(decoded?.schoolName).toBe(mockPayload.schoolName);
    });

    it('should return null for an invalid token', () => {
      const invalidToken = 'not.a.jwt';
      const decoded = decodeToken(invalidToken);
      
      expect(decoded).toBeNull();
    });
  });
});