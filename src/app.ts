import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { csrfProtection, setCsrfHeaders } from './middlewares/csrfMiddleware';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';

// Import routes
import authRoutes from './routes/authRoutes';
import licenseRoutes from './routes/licenseRoutes';
import roleRoutes from './routes/roleRoutes';
// import securityRoutes from './routes/securityRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'sameorigin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

app.use(cors({
  origin: true, // Reflect the request origin
  credentials: true, // Allow cookies to be sent
  exposedHeaders: ['Content-Length', 'X-CSRF-Token'],
  maxAge: 86400 // 24 hours
}));
app.use(setCsrfHeaders);
app.use(compression());
app.use(express.json({ limit: '10kb' })); // Limit request body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Apply CSRF protection to all mutating routes
app.use('/api', csrfProtection);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/licenses', licenseRoutes);
// app.use('/api/features', featureRoutes); //? Features Validation
// app.use('/api/analytics', analyticsRoutes); //? Analytics of used Features
// app.use('/api/licenses', securityRoutes); // Add security routes under the licenses path

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

export default app;