import { generateToken, verifyToken } from '../../utils/jwt';
import jwt from 'jsonwebtoken';

describe('JWT Security Tests', () => {
  const payload = { sub: 'test', schoolId: '12345' };
  const secret = process.env.JWT_SECRET || 'test_secret';
  
  test('should reject tokens signed with incorrect secret', () => {
    // Generate token with wrong secret
    const wrongSecret = 'wrong_secret';
    const token = jwt.sign(payload, wrongSecret);
    
    // Verify should fail
    expect(() => verifyToken(token)).toThrow();
  });
  
  test('should reject expired tokens', () => {
    // Generate token that's already expired
    const expiredToken = jwt.sign(
      { ...payload, iat: Math.floor(Date.now() / 1000) - 3600, exp: Math.floor(Date.now() / 1000) - 1800 },
      secret
    );
    
    // Verify should fail
    expect(() => verifyToken(expiredToken)).toThrow(/expired/i);
  });
  
  test('should reject tampered tokens', () => {
    // Generate valid token
    const token = generateToken(payload);
    
    // Tamper with the token by changing a character in the payload section
    const parts = token.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');
    
    // Decode payload, modify it, and re-encode (but don't re-sign)
    const decodedPayload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    decodedPayload.schoolId = '67890'; // Change schoolId
    const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64')
      .replace(/=/g, ''); // Remove padding
    
    // Reassemble token with tampered payload
    const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;
    
    // Verify should fail
    expect(() => verifyToken(tamperedToken)).toThrow(/invalid/i);
  });
  
  test('should reject tokens with invalid structure', () => {
    // Create tokens with invalid structure
    const invalidTokens = [
      'not.a.token',
      'not.even.close.to.a.token',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Header only
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0', // Missing signature
      'garbage.garbage.garbage'
    ];
    
    // All should fail verification
    invalidTokens.forEach(token => {
      expect(() => verifyToken(token)).toThrow();
    });
  });
  
  test('should use strong algorithm for token signing', () => {
    // Generate token
    const token = generateToken(payload);
    
    // Decode header without verification
    const header = JSON.parse(Buffer.from(token.split('.')[0], 'base64').toString());
    
    // Check algorithm - should be HS256 or stronger
    expect(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'])
      .toContain(header.alg);
  });
});