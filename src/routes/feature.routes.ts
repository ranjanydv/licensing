import { Router } from 'express';
import { featureController } from '../controllers/feature.controller';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @swagger
 * /features/{licenseId}/{featureName}:
 *   get:
 *     summary: Check if a license has a specific feature
 *     description: Verifies if a license has a specific feature enabled
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: path
 *         name: featureName
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature name to check
 *     responses:
 *       200:
 *         description: Feature check result
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
 *                     hasFeature:
 *                       type: boolean
 *                       example: true
 *                     feature:
 *                       $ref: '#/components/schemas/Feature'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:licenseId/:featureName', authenticate, featureController.hasFeature);

/**
 * @swagger
 * /features/{licenseId}/{featureName}/validate:
 *   post:
 *     summary: Validate a feature against its restrictions
 *     description: Validates if a feature can be used based on its restrictions
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: path
 *         name: featureName
 *         required: true
 *         schema:
 *           type: string
 *         description: Feature name to validate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Context data for validation against feature restrictions
 *     responses:
 *       200:
 *         description: Feature validation result
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
 *                     valid:
 *                       type: boolean
 *                       example: true
 *                     message:
 *                       type: string
 *                       example: Feature is valid for use
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:licenseId/:featureName/validate', authenticate, featureController.validateFeature);

/**
 * @swagger
 * /features/{licenseId}/validate:
 *   post:
 *     summary: Validate multiple features
 *     description: Validates multiple features against their restrictions
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: licenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               features:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       description: Feature name
 *                     context:
 *                       type: object
 *                       description: Context data for validation
 *     responses:
 *       200:
 *         description: Features validation results
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
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           featureName:
 *                             type: string
 *                             example: attendance
 *                           valid:
 *                             type: boolean
 *                             example: true
 *                           message:
 *                             type: string
 *                             example: Feature is valid for use
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:licenseId/validate', authenticate, featureController.validateFeatures);

export default router;