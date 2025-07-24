import { Request, Response } from 'express';
import { csrfProtection, setCsrfHeaders } from '../../middlewares/csrfMiddleware';
import { AppError } from '../../middlewares/errorHandler';

describe('CSRF Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      method: 'POST',
      headers: {
        host: 'example.com',
        origin: 'https://example.com'
      },
      path: '/api/test',
      ip: '127.0.0.1'
    };
    mockResponse = {
      setHeader: jest.fn()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('csrfProtection', () => {
    it('should call next for GET requests without checking origin', () => {
      // Setup
      mockRequest.method = 'GET';
      mockRequest.headers.origin = undefined;

      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next for HEAD requests without checking origin', () => {
      // Setup
      mockRequest.method = 'HEAD';
      mockRequest.headers.origin = undefined;

      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next for OPTIONS requests without checking origin', () => {
      // Setup
      mockRequest.method = 'OPTIONS';
      mockRequest.headers.origin = undefined;

      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next if origin matches host', () => {
      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next if referer matches host', () => {
      // Setup
      mockRequest.headers.origin = undefined;
      mockRequest.headers.referer = 'https://example.com/some/path';

      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if no origin or referer is provided', () => {
      // Setup
      mockRequest.headers.origin = undefined;
      mockRequest.headers.referer = undefined;

      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('CSRF check failed: Missing Origin or Referer header');
    });

    it('should call next with error if origin host does not match request host', () => {
      // Setup
      mockRequest.headers.origin = 'https://attacker.com';

      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('CSRF check failed: Invalid Origin');
    });

    it('should call next with error if origin is not a valid URL', () => {
      // Setup
      mockRequest.headers.origin = 'invalid-url';

      // Execute
      csrfProtection(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('CSRF check failed: Invalid Origin format');
    });
  });

  describe('setCsrfHeaders', () => {
    it('should set the Vary header', () => {
      // Execute
      setCsrfHeaders(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Vary', 'Origin');
    });

    it('should set the SameSite cookie attribute', () => {
      // Execute
      setCsrfHeaders(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Set-Cookie', 'SameSite=Strict; Secure');
    });

    it('should call next', () => {
      // Execute
      setCsrfHeaders(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });
  });
});