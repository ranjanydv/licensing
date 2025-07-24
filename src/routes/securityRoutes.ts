import express from 'express';
import { 
  registerHardwareFingerprint,
  removeHardwareFingerprint,
  updateIpRestrictions,
  updateDeviceLimit,
  blacklistLicense,
  removeFromBlacklist,
  checkBlacklistStatus
} from '../controllers/securityController';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize } from '../middlewares/authorizationMiddleware';

const router = express.Router();

/**
 * @swagger
 * /licenses/{id}/hardware-binding:
 *   post:
 *     summary: Register hardware fingerprint
 *     description: Registers a hardware fingerprint for license binding
 *     tags: [Security]
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
 *               - fingerprint
 *               - deviceName
 *             properties:
 *               fingerprint:
 *                 type: string
 *                 description: Hardware fingerprint
 *               deviceName:
 *                 type: string
 *                 description: Name of the device
 *               deviceType:
 *                 type: string
 *                 description: Type of device
 *     responses:
 *       200:
 *         description: Hardware fingerprint registered successfully
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
 *                       example: Hardware fingerprint registered successfully
 *       400:
 *         $ref: '#/components/responses/BadRequestError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/hardware-binding', registerHardwareFingerprint);

/**
 * @swagger
 * /licenses/{id}/hardware-binding/{fingerprint}:
 *   delete:
 *     summary: Remove hardware fingerprint
 *     description: Removes a hardware fingerprint from a license
 *     tags: [Security]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID
 *       - in: path
 *         name: fingerprint
 *         required: true
 *         schema:
 *           type: string
 *         description: Hardware fingerprint to remove
 *     responses:
 *       200:
 *         description: Hardware fingerprint removed successfully
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
 *                       example: Hardware fingerprint removed successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id/hardware-binding/:fingerprint', authenticate, authorize(['admin']), removeHardwareFingerprint);

/**
 * @swagger
 * /licenses/{id}/ip-restrictions:
 *   put:
 *     summary: Update IP restrictions
 *     description: Updates IP address restrictions for a license
 *     tags: [Security]
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
 *               allowedIps:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of allowed IP addresses or CIDR ranges
 *               restrictionEnabled:
 *                 type: boolean
 *                 description: Whether IP restrictions are enabled
 *     responses:
 *       200:
 *         description: IP restrictions updated successfully
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
 *                       example: IP restrictions updated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id/ip-restrictions', authenticate, authorize(['admin']), updateIpRestrictions);

/**
 * @swagger
 * /licenses/{id}/device-limit:
 *   put:
 *     summary: Update device limit
 *     description: Updates the maximum number of devices allowed for a license
 *     tags: [Security]
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
 *               - deviceLimit
 *             properties:
 *               deviceLimit:
 *                 type: integer
 *                 description: Maximum number of devices allowed
 *               enforceLimit:
 *                 type: boolean
 *                 description: Whether to enforce the device limit
 *     responses:
 *       200:
 *         description: Device limit updated successfully
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
 *                       example: Device limit updated successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.put('/:id/device-limit', authenticate, authorize(['admin']), updateDeviceLimit);

/**
 * @swagger
 * /licenses/{id}/blacklist:
 *   post:
 *     summary: Blacklist a license
 *     description: Adds a license to the blacklist
 *     tags: [Security]
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
 *               reason:
 *                 type: string
 *                 description: Reason for blacklisting
 *     responses:
 *       200:
 *         description: License blacklisted successfully
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
 *                       example: License blacklisted successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.post('/:id/blacklist', authenticate, authorize(['admin']), blacklistLicense);

/**
 * @swagger
 * /licenses/{id}/blacklist:
 *   delete:
 *     summary: Remove license from blacklist
 *     description: Removes a license from the blacklist
 *     tags: [Security]
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
 *         description: License removed from blacklist successfully
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
 *                       example: License removed from blacklist successfully
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.delete('/:id/blacklist', authenticate, authorize(['admin']), removeFromBlacklist);

/**
 * @swagger
 * /licenses/{idOrKey}/blacklist-status:
 *   get:
 *     summary: Check blacklist status
 *     description: Checks if a license is blacklisted
 *     tags: [Security]
 *     parameters:
 *       - in: path
 *         name: idOrKey
 *         required: true
 *         schema:
 *           type: string
 *         description: License ID or key
 *     responses:
 *       200:
 *         description: Blacklist status
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
 *                     blacklisted:
 *                       type: boolean
 *                       example: false
 *                     reason:
 *                       type: string
 *                       example: null
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 */
router.get('/:idOrKey/blacklist-status', checkBlacklistStatus);

export default router;