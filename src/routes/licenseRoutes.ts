import express from 'express';
import { 
  generateLicense,
  getLicenses,
  getLicenseById,
  updateLicense,
  revokeLicense,
  validateLicense,
  transferLicense
} from '../controllers/licenseController';
import { licenseValidationLimiter, licenseGenerationLimiter } from '../middlewares/rateLimiter';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = express.Router();

/**
 * @swagger
 * /licenses/validate:
 *   post:
 *     summary: Validate a license
 *     description: Validates a license key against the system
 *     tags: [Licenses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - licenseKey
 *               - schoolId
 *             properties:
 *               licenseKey:
 *                 type: string
 *                 description: The license key to validate
 *               schoolId:
 *                 type: string
 *                 description: The school ID associated with the license
 *     responses:
 *       200:
 *         description: License is valid
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
 *                     expiresIn:
 *                       type: number
 *                       description: Days until expiration
 *                       example: 30
 *                     features:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["attendance", "gradebook", "reports"]
 *       401:
 *         description: License is invalid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: error
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: false
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["License has expired", "School ID does not match"]
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsError'
 */
router.post('/validate', licenseValidationLimiter, validateLicense);

/**
 * @swagger
 * /licenses:
 *   post:
 *     summary: Generate a new license
 *     description: Creates a new license for a school
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LicenseRequest'
 *     responses:
 *       201:
 *         description: License created successfully
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
 *                     license:
 *                       $ref: '#/components/schemas/License'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       429:
 *         $ref: '#/components/responses/TooManyRequestsError'
 */
router.post('/', authenticate, authorize(['admin']), licenseGenerationLimiter, generateLicense);

/**
 * @swagger
 * /licenses:
 *   get:
 *     summary: Get all licenses
 *     description: Retrieves a list of all licenses with optional filtering
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, expired, revoked, pending]
 *         description: Filter licenses by status
 *       - in: query
 *         name: schoolId
 *         schema:
 *           type: string
 *         description: Filter licenses by school ID
 *     responses:
 *       200:
 *         description: List of licenses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 results:
 *                   type: number
 *                   example: 10
 *                 data:
 *                   type: object
 *                   properties:
 *                     licenses:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/License'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
router.get('/', authenticate, authorize(['admin', 'support']), getLicenses);

/**
 * @swagger
 * /licenses/{id}:
 *   get:
 *     summary: Get license by ID
 *     description: Retrieves a specific license by its ID
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *     responses:
 *       200:
 *         description: License details
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
 *                     license:
 *                       $ref: '#/components/schemas/License'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:id', authenticate, authorize(['admin', 'support']), getLicenseById);

/**
 * @swagger
 * /licenses/{id}:
 *   put:
 *     summary: Update license
 *     description: Updates an existing license
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               duration:
 *                 type: number
 *                 description: License duration in days
 *               features:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Feature'
 *               metadata:
 *                 type: object
 *                 description: Additional metadata
 *     responses:
 *       200:
 *         description: License updated successfully
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
 *                     license:
 *                       $ref: '#/components/schemas/License'
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id', authenticate, authorize(['admin']), updateLicense);

/**
 * @swagger
 * /licenses/{id}:
 *   delete:
 *     summary: Revoke license
 *     description: Revokes an existing license
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *     responses:
 *       200:
 *         description: License revoked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: License revoked successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id', authenticate, authorize(['admin']), revokeLicense);

/**
 * @swagger
 * /licenses/{id}/transfer:
 *   post:
 *     summary: Transfer license
 *     description: Transfers a license to a different school
 *     tags: [Licenses]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *             required:
 *               - newSchoolId
 *               - newSchoolName
 *             properties:
 *               newSchoolId:
 *                 type: string
 *                 description: ID of the school to transfer the license to
 *               newSchoolName:
 *                 type: string
 *                 description: Name of the school to transfer the license to
 *     responses:
 *       200:
 *         description: License transferred successfully
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
 *                     license:
 *                       $ref: '#/components/schemas/License'
 *                     message:
 *                       type: string
 *                       example: License successfully transferred to Example School
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/transfer', authenticate, authorize(['admin']), transferLicense);

export default router;