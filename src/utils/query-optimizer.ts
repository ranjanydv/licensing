import mongoose from 'mongoose';
import { Logger } from './logger';
const logger = new Logger('QueryOptimizer');

/**
 * Query optimizer utility functions
 */
export class QueryOptimizer {
  /**
   * Explain a MongoDB query to analyze its performance
   * @param model Mongoose model
   * @param query Query object
   * @param options Query options
   * @returns Explanation of query execution plan
   */
  static async explainQuery(
    model: mongoose.Model<any>,
    query: any,
    options: any = {}
  ): Promise<any> {
    try {
      const explanation = await model.find(query, null, options).explain('executionStats');
      return explanation;
    } catch (error) {
      logger.error('Error explaining query:', {error});
      throw error;
    }
  }

  /**
   * Log query performance metrics
   * @param model Mongoose model
   * @param query Query object
   * @param options Query options
   * @param queryName Name of the query for logging
   */
  static async logQueryPerformance(
    model: mongoose.Model<any>,
    query: any,
    options: any = {},
    queryName: string = 'Query'
  ): Promise<void> {
    try {
      const explanation = await this.explainQuery(model, query, options);
      const stats = explanation.executionStats;
      
      logger.info(`${queryName} Performance:`, {
        executionTimeMillis: stats.executionTimeMillis,
        totalDocsExamined: stats.totalDocsExamined,
        totalKeysExamined: stats.totalKeysExamined,
        nReturned: stats.nReturned,
        usedIndexes: explanation.queryPlanner.winningPlan.inputStage?.indexName || 'No index used'
      });
      
      // Log warning if query is inefficient
      if (stats.totalDocsExamined > stats.nReturned * 2) {
        logger.warn(`${queryName} is inefficient. Examined ${stats.totalDocsExamined} docs to return ${stats.nReturned}.`);
      }
    } catch (error) {
      logger.error(`Error analyzing ${queryName} performance:`, {error});
    }
  }

  /**
   * Get recommended indexes for a collection based on query patterns
   * @param model Mongoose model
   * @returns Array of recommended indexes
   */
  static async getRecommendedIndexes(model: mongoose.Model<any>): Promise<string[]> {
    try {
      // This requires MongoDB Enterprise or Atlas
      // For community edition, this is a placeholder
      // In a real implementation, you would use MongoDB Atlas or Enterprise features
      
      // Placeholder implementation
      return [
        'Consider indexes based on your most common query patterns',
        'For range queries, put equality conditions before range conditions in compound indexes',
        'For sort operations, include the sort fields in your indexes'
      ];
    } catch (error) {
      logger.error('Error getting recommended indexes:', {error});
      throw error;
    }
  }
}

export default QueryOptimizer;