import compression from 'compression';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { connectDatabase } from './config/database';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';
import analyticsRoutes from './routes/analytics.routes';
import featureRoutes from './routes/feature.routes';
import licenseRoutes from './routes/licenseRoutes';
import securityRoutes from './routes/securityRoutes';
import { Logger } from './utils/logger';
// import { customCss, specs } from './config/swagger';
// import swaggerUi from 'swagger-ui-express';
// import { stopAllCronJobs } from './cron';

// Load environment variables
dotenv.config();

// Create Express app
const app = express() as express.Express;
const logger = new Logger('Server');

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Swagger documentation
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
//   explorer: true,
//   customCss: customCss,
//   customSiteTitle: 'License Management System API Documentation',
//   customJs: '/custom.js',
//   swaggerOptions: {
//     persistAuthorization: true,
//     docExpansion: 'none',
//     filter: true,
//     displayRequestDuration: true
//   },
//   customCssUrl: '/custom.css',
//   customfavIcon: '/favicon.ico'
// }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Routes
app.use('/api/licenses', licenseRoutes);
app.use('/api/licenses', securityRoutes); // Add security routes under the licenses path
app.use('/api/features', featureRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling middleware
app.use(errorHandler);

// Start the server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();
    
    // Start server
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port http://localhost:${PORT}`);
      
      // Setup cron jobs
      // setupCronJobs();
      
      logger.info('License Management System initialized successfully');
    });
    
    // Handle graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Shutting down gracefully...`);
      
      // Stop all cron jobs
      // stopAllCronJobs();
      // logger.info('Cron jobs stopped');
      
      // Close server
      server.close(() => {
        logger.info('HTTP server closed');
        
        // Disconnect from database
        // This would be implemented in the database module
        logger.info('Database connections closed');
        
        process.exit(0);
      });
      
      // Force close after 10s
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Listen for termination signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to start server:', { error });
    process.exit(1);
  }
};

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export default app;