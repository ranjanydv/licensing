import express from 'express';
import { 
  getAllRoles, 
  getRoleById, 
  createRole, 
  updateRole, 
  deleteRole, 
  addPermission, 
  removePermission, 
  getRolesByPermission 
} from '../controllers/role.controller';
import { authenticate } from '../middlewares/authMiddleware';
import { authorize, requirePermission } from '../middlewares/authorizationMiddleware';
import { validate, ValidationSource } from '../middlewares/validationMiddleware';
import { 
  createRoleSchema, 
  updateRoleSchema, 
  roleIdParamSchema, 
  addPermissionSchema 
} from '../schemas/auth.schema';
import { apiLimiter } from '../middlewares/rateLimiter';

const router = express.Router();

/**
 * Apply authentication middleware to all routes
 */
// router.use(authenticate);

/**
 * Apply admin-only authorization to all routes
 * Roles can only be managed by admins
 */
// router.use(authorize(['admin']));

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: Get all roles
 *     description: Retrieves a list of all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles
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
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           permissions:
 *                             type: array
 *                             items:
 *                               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/', apiLimiter, getAllRoles);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get role by ID
 *     description: Retrieves a specific role by its ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role details
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
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.get('/:id', 
  validate(roleIdParamSchema, ValidationSource.PARAMS), 
  apiLimiter, 
  getRoleById
);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role
 *     description: Creates a new role with permissions
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - permissions
 *             properties:
 *               name:
 *                 type: string
 *                 enum: [admin, support]
 *                 description: Role name
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of permissions
 *     responses:
 *       201:
 *         description: Role created successfully
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
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       409:
 *         description: Role already exists
 */
router.post('/', 
  validate(createRoleSchema), 
  apiLimiter, 
  createRole
);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Update a role
 *     description: Updates an existing role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 enum: [admin, support]
 *                 description: Role name
 *               permissions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of permissions
 *     responses:
 *       200:
 *         description: Role updated successfully
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
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 *       409:
 *         description: Role name already in use
 */
router.put('/:id', 
  validate(roleIdParamSchema, ValidationSource.PARAMS), 
  validate(updateRoleSchema), 
  apiLimiter, 
  updateRole
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Delete a role
 *     description: Deletes an existing role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     responses:
 *       200:
 *         description: Role deleted successfully
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
 *                   example: Role deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.delete('/:id', 
  validate(roleIdParamSchema, ValidationSource.PARAMS), 
  apiLimiter, 
  deleteRole
);

/**
 * @swagger
 * /roles/{id}/permissions:
 *   post:
 *     summary: Add permission to role
 *     description: Adds a permission to an existing role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - permission
 *             properties:
 *               permission:
 *                 type: string
 *                 description: Permission to add
 *     responses:
 *       200:
 *         description: Permission added successfully
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
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.post('/:id/permissions', 
  validate(roleIdParamSchema, ValidationSource.PARAMS), 
  validate(addPermissionSchema), 
  apiLimiter, 
  addPermission
);

/**
 * @swagger
 * /roles/{id}/permissions/{permission}:
 *   delete:
 *     summary: Remove permission from role
 *     description: Removes a permission from an existing role
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Role ID
 *       - in: path
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission to remove
 *     responses:
 *       200:
 *         description: Permission removed successfully
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
 *                     role:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: string
 *                         permissions:
 *                           type: array
 *                           items:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Role not found
 */
router.delete('/:id/permissions/:permission', 
  validate(roleIdParamSchema, ValidationSource.PARAMS), 
  apiLimiter, 
  removePermission
);

/**
 * @swagger
 * /roles/permission/{permission}:
 *   get:
 *     summary: Get roles by permission
 *     description: Retrieves a list of roles that have a specific permission
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: permission
 *         required: true
 *         schema:
 *           type: string
 *         description: Permission to search for
 *     responses:
 *       200:
 *         description: List of roles with the specified permission
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
 *                     roles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           permissions:
 *                             type: array
 *                             items:
 *                               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/permission/:permission', 
  apiLimiter, 
  getRolesByPermission
);

export default router;