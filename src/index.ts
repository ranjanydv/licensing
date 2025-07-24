import mongoose from 'mongoose';
import dotenv from 'dotenv';
import app from './app';
import { Logger } from './utils/logger';

// Load environment variables
dotenv.config();

const logger = new Logger('Server');

// Get port from environment variables
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/license-management';

// Connect to MongoDB
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    logger.info('Connected to MongoDB');
    
    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('MongoDB connection error:', { error });
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (error: Error) => {
  logger.error('Unhandled promise rejection:', { error });
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', { error });
  process.exit(1);
});