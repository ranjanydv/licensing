import request from 'supertest';
import app from '../../app';

describe('Secure HTTP Headers', () => {
  it('should set secure HTTP headers', async () => {
    const res = await request(app).get('/health');
    
    // Check for Helmet's default security headers
    expect(res.headers).toHaveProperty('x-dns-prefetch-control');
    expect(res.headers).toHaveProperty('x-frame-options');
    expect(res.headers).toHaveProperty('strict-transport-security');
    expect(res.headers).toHaveProperty('x-download-options');
    expect(res.headers).toHaveProperty('x-content-type-options');
    expect(res.headers).toHaveProperty('x-permitted-cross-domain-policies');
    expect(res.headers).toHaveProperty('x-xss-protection');
    
    // Check specific header values
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-xss-protection']).toBe('0');
  });

  it('should set CORS headers', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', 'http://example.com');
    
    expect(res.headers).toHaveProperty('access-control-allow-origin');
    expect(res.headers['access-control-allow-origin']).toBe('http://example.com');
    expect(res.headers).toHaveProperty('access-control-allow-credentials');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('should set CSRF headers', async () => {
    const res = await request(app).get('/health');
    
    expect(res.headers).toHaveProperty('vary');
    expect(res.headers['vary']).toContain('Origin');
    expect(res.headers).toHaveProperty('set-cookie');
    expect(res.headers['set-cookie'][0]).toContain('SameSite=Strict');
    expect(res.headers['set-cookie'][0]).toContain('Secure');
  });
});