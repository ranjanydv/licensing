import 'dotenv/config';
import mongoose from 'mongoose';
import { LicenseModel } from '../models/license.model';
import { QueryOptimizer } from '../utils/query-optimizer';
import { LicenseStatus } from '../interfaces/license.interface';
  import { Logger } from '../utils/logger';

const logger = new Logger('AnalyzeQueries');

/**
 * Script to analyze and optimize database queries
 */
async function analyzeQueries(): Promise<void> {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI as string);
    logger.info('Connected to MongoDB');

    // Analyze common queries
    logger.info('Analyzing common queries...');

    // 1. Find active licenses
    await QueryOptimizer.logQueryPerformance(
      LicenseModel,
      { status: LicenseStatus.ACTIVE },
      {},
      'Find Active Licenses'
    );

    // 2. Find expired licenses
    await QueryOptimizer.logQueryPerformance(
      LicenseModel,
      {
        $or: [
          { status: LicenseStatus.EXPIRED },
          {
            status: LicenseStatus.ACTIVE,
            expiresAt: { $lt: new Date() }
          }
        ]
      },
      {},
      'Find Expired Licenses'
    );

    // 3. Find licenses by school ID with status
    await QueryOptimizer.logQueryPerformance(
      LicenseModel,
      { schoolId: 'sample-school-id', status: LicenseStatus.ACTIVE },
      {},
      'Find Licenses by School ID with Status'
    );

    // 4. Find licenses with pagination and sorting
    await QueryOptimizer.logQueryPerformance(
      LicenseModel,
      { status: LicenseStatus.ACTIVE },
      { limit: 10, skip: 0, sort: { createdAt: -1 } },
      'Find Licenses with Pagination and Sorting'
    );

    // 5. Find licenses with complex filtering
    await QueryOptimizer.logQueryPerformance(
      LicenseModel,
      {
        status: LicenseStatus.ACTIVE,
        expiresAt: { $gt: new Date() },
        'securityRestrictions.hardwareBinding.enabled': true
      },
      {},
      'Find Licenses with Complex Filtering'
    );

    // Get current indexes
    const indexes = await LicenseModel.collection.indexes();
    logger.info('Current indexes:', indexes);

    // Get recommended indexes
    const recommendations = await QueryOptimizer.getRecommendedIndexes(LicenseModel);
    logger.info('Index recommendations:', recommendations);

    logger.info('Query analysis complete');
  } catch (error) {
    logger.error('Error analyzing queries:', {error});
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  }
}

// Run the analysis if this script is executed directly
if (require.main === module) {
  analyzeQueries()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Unhandled error:', error);
      process.exit(1);
    });
}

export default analyzeQueries;