import { Request, Response } from 'express';
import { catchAsync, AppError, LicenseError } from '../middlewares/errorHandler';
import { licenseService } from '../services/license.service';
import { validate, licenseRequestSchema, licenseUpdateSchema, licenseValidationSchema } from '../utils/validation';
import { LicenseRequest } from '../interfaces/license.interface';
import { Logger } from '../utils/logger';

const logger = new Logger('LicenseController');

/**
 * Generate a new license
 * @route POST /api/licenses
 */
export const generateLicense = catchAsync(async (req: Request, res: Response) => {
    try {
        // Validate request body
        const licenseData = validate(licenseRequestSchema, req.body) as LicenseRequest;

        // Set createdBy from authenticated user (if not provided)
        if (!licenseData.createdBy) {
            licenseData.createdBy = req.body.userId || 'system';
        }
        // Generate license
        const license = await licenseService.generateLicense(licenseData);

        res.status(201).json({
            status: 'success',
            data: {
                license: {
                    licenseKey: license.licenseKey,
                    expiresAt: license.expiresAt,
                    features: license.features.filter(f => f.enabled).map(f => f.name),
                    schoolId: license.schoolId,
                    schoolName: license.schoolName,
                    status: license.status,
                    issuedAt: license.issuedAt,
                    metadata: license.metadata
                }
            }
        });
    } catch (error) {
        if (error instanceof LicenseError) {
            throw error;
        }

        logger.error('Error generating license:', { error });
        throw new AppError(`Failed to generate license: ${(error as Error).message}`, 400);
    }
});

/**
 * Get all licenses
 * @route GET /api/licenses
 */
export const getLicenses = catchAsync(async (req: Request, res: Response) => {
    const { status, schoolId, page = 1, limit = 20, search } = req.query;

    // Build filter object
    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (schoolId) filter.schoolId = schoolId;

    if (search) {
        filter.schoolName = { $regex: search, $options: 'i' };
    }

    // Pagination
    const pageNum = Math.max(Number(page) || 1, 1);
    const limitNum = Math.max(Number(limit) || 20, 1);
    const skip = (pageNum - 1) * limitNum;

    // Get paginated licenses and total count
    const { licenses, total } = await licenseService.getAllLicenses(filter, { skip, limit: limitNum });

    // Return success response
    res.status(200).json({
        status: 'success',
        results: licenses.length,
        data: {
            licenses
        },
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
    });
});

/**
 * Get license by ID
 * @route GET /api/licenses/:id
 */
export const getLicenseById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get license
    const license = await licenseService.getLicense(id);

    // Check if license exists
    if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
    }

    // Return success response
    res.status(200).json({
        status: 'success',
        data: {
            license
        }
    });
});

/**
 * Update license
 * @route PUT /api/licenses/:id
 */
export const updateLicense = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Validate request body
    const updateData = validate(licenseUpdateSchema, req.body);

    // Get updatedBy from authenticated user
    const updatedBy = req.body.userId || 'system';

    // Update license
    const license = await licenseService.updateLicense(id, updateData as Partial<LicenseRequest>, updatedBy);

    // Check if license exists
    if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
    }

    // Return success response
    res.status(200).json({
        status: 'success',
        data: {
            license
        }
    });
});

/**
 * Revoke license
 * @route DELETE /api/licenses/:id
 */
export const revokeLicense = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Get updatedBy from authenticated user
    const updatedBy = req.body.userId || 'system';

    // Revoke license
    const result = await licenseService.revokeLicense(id, updatedBy);

    // Check if license exists
    if (!result) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
    }

    // Return success response
    res.status(200).json({
        status: 'success',
        message: 'License revoked successfully'
    });
});

/**
 * Validate license
 * @route POST /api/licenses/validate
 */
export const validateLicense = catchAsync(async (req: Request, res: Response) => {
    // Validate request body
    const { licenseKey, schoolId } = validate(licenseValidationSchema, req.body);

    // Validate license
    const result = await licenseService.validateLicense(licenseKey, schoolId);

    // Return response based on validation result
    if (result.valid) {
        res.status(200).json({
            status: 'success',
            data: {
                valid: true,
                expiresIn: result.expiresIn,
                features: result.license?.features.filter(f => f.enabled).map(f => f.name)
            }
        });
    } else {
        res.status(401).json({
            status: 'error',
            data: {
                valid: false,
                errors: result.errors
            }
        });
    }
});
/**
 
* Transfer license to a different school
 * @route POST /api/licenses/:id/transfer
 */
export const transferLicense = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { newSchoolId, newSchoolName } = req.body;

    // Validate required fields
    if (!newSchoolId || !newSchoolName) {
        throw new AppError('New school ID and name are required', 400);
    }

    // Get updatedBy from authenticated user
    const updatedBy = req.body.userId || 'system';

    // Transfer license
    const license = await licenseService.transferLicense(id, newSchoolId, newSchoolName, updatedBy);

    // Check if license exists
    if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
    }

    // Return success response
    res.status(200).json({
        status: 'success',
        data: {
            license,
            message: `License successfully transferred to ${newSchoolName}`
        }
    });
});