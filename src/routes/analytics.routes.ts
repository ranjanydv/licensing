import { Router } from 'express';
import { analyticsController } from '../controllers/analytics.controller';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @swagger
 * /analytics/events:
 *   post:
 *     summary: Track a custom usage event
 *     description: Records a custom usage event for analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licenseId
 *               - eventName
 *             properties:
 *               licenseId:
 *                 type: string
 *                 description: License ID
 *               eventName:
 *                 type: string
 *                 description: Name of the event
 *               eventData:
 *                 type: object
 *                 description: Additional event data
 *     responses:
 *       200:
 *         description: Event tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Event tracked successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 */
router.post('/events', authenticate, analyticsController.trackEvent);

/**
 * @swagger
 * /analytics/feature-usage:
 *   post:
 *     summary: Track feature usage
 *     description: Records feature usage for analytics
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licenseId
 *               - featureName
 *             properties:
 *               licenseId:
 *                 type: string
 *                 description: License ID
 *               featureName:
 *                 type: string
 *                 description: Name of the feature
 *               usageData:
 *                 type: object
 *                 description: Additional usage data
 *     responses:
 *       200:
 *         description: Feature usage tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Feature usage tracked successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 */
router.post('/feature-usage', authenticate, analyticsController.trackFeatureUsage);

/**
 * @swagger
 * /analytics/reports/{licenseId}:
 *   get:
 *     summary: Get usage report for a license
 *     description: Retrieves a comprehensive usage report for a specific license
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the report (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the report (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Usage report
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     report:
 *                       type: object
 *                       properties:
 *                         totalUsage:
 *                           type: number
 *                           example: 1250
 *                         featureBreakdown:
 *                           type: object
 *                         dailyUsage:
 *                           type: array
 *                           items:
 *                             type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/reports/:licenseId', authenticate, analyticsController.getUsageReport);

/**
 * @swagger
 * /analytics/features/{licenseId}:
 *   get:
 *     summary: Get feature usage statistics
 *     description: Retrieves usage statistics for features in a specific license
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the statistics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Feature usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     features:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: attendance
 *                           usageCount:
 *                             type: number
 *                             example: 450
 *                           lastUsed:
 *                             type: string
 *                             format: date-time
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/features/:licenseId', authenticate, analyticsController.getFeatureUsageStats);

/**
 * @swagger
 * /analytics/daily/{licenseId}:
 *   get:
 *     summary: Get daily usage statistics
 *     description: Retrieves daily usage statistics for a specific license
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the statistics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Daily usage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     dailyStats:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             format: date
 *                             example: "2025-07-21"
 *                           totalUsage:
 *                             type: number
 *                             example: 125
 *                           featureBreakdown:
 *                             type: object
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/daily/:licenseId', authenticate, analyticsController.getDailyUsageStats);

/**
 * @swagger
 * /analytics/most-used/{licenseId}:
 *   get:
 *     summary: Get most used features
 *     description: Retrieves the most frequently used features for a specific license
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Number of top features to return
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the statistics (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the statistics (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Most used features
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     features:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           name:
 *                             type: string
 *                             example: attendance
 *                           usageCount:
 *                             type: number
 *                             example: 450
 *                           percentage:
 *                             type: number
 *                             example: 36.5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/most-used/:licenseId', authenticate, analyticsController.getMostUsedFeatures);

/**
 * @swagger
 * /analytics/trends/{licenseId}:
 *   get:
 *     summary: Get license usage trends
 *     description: Retrieves usage trends over time for a specific license
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly]
 *           default: weekly
 *         description: Time period for trend analysis
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for the trends (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for the trends (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: License usage trends
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     trends:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           period:
 *                             type: string
 *                             example: "2025-W29"
 *                           usageCount:
 *                             type: number
 *                             example: 1250
 *                           changePercentage:
 *                             type: number
 *                             example: 5.2
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/trends/:licenseId', authenticate, analyticsController.getLicenseUsageTrends);

export default router;