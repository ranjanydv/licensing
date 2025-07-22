import mongoose from 'mongoose';
import { Logger } from '../utils/logger';

const logger = new Logger('Database');
export const connectDatabase = async (): Promise<void> => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://172.30.192.1:27017/license-management';
    
    // Configure MongoDB connection options
    const options = {
      autoIndex: true, // Build indexes
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };
    
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, options);
    
    logger.info('Connected to MongoDB successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed due to application termination');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', {error});
    process.exit(1);
  }
};

export default connectDatabase;