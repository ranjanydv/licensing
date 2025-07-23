import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';
import { getMarkdownDocs, generateSwaggerHtml, swaggerCustomCss } from './swaggerDocs';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'License Management System API',
      version,
      description: 'API documentation for the License Management System',
      license: {
        name: 'ISC',
      },
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        License: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'License ID',
            },
            schoolId: {
              type: 'string',
              description: 'School ID',
            },
            schoolName: {
              type: 'string',
              description: 'School name',
            },
            licenseKey: {
              type: 'string',
              description: 'JWT token',
            },
            licenseHash: {
              type: 'string',
              description: 'Additional hash for verification',
            },
            features: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Feature',
              },
            },
            issuedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Issue date',
            },
            expiresAt: {
              type: 'string',
              format: 'date-time',
              description: 'Expiration date',
            },
            lastChecked: {
              type: 'string',
              format: 'date-time',
              description: 'Last checked date',
            },
            status: {
              type: 'string',
              enum: ['active', 'expired', 'revoked', 'pending'],
              description: 'License status',
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
            createdBy: {
              type: 'string',
              description: 'User who created the license',
            },
            updatedBy: {
              type: 'string',
              description: 'User who last updated the license',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Creation date',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Last update date',
            },
          },
        },
        Feature: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Feature name',
            },
            enabled: {
              type: 'boolean',
              description: 'Whether the feature is enabled',
            },
            restrictions: {
              type: 'object',
              description: 'Feature restrictions',
            },
          },
        },
        LicenseRequest: {
          type: 'object',
          required: ['schoolId', 'schoolName', 'duration', 'features'],
          properties: {
            schoolId: {
              type: 'string',
              description: 'School ID',
            },
            schoolName: {
              type: 'string',
              description: 'School name',
            },
            duration: {
              type: 'number',
              description: 'License duration in days',
            },
            features: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Feature',
              },
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata',
            },
            createdBy: {
              type: 'string',
              description: 'User who created the license',
            },
          },
        },
        ValidationResult: {
          type: 'object',
          properties: {
            valid: {
              type: 'boolean',
              description: 'Whether the license is valid',
            },
            license: {
              $ref: '#/components/schemas/License',
            },
            errors: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'Validation errors',
            },
            expiresIn: {
              type: 'number',
              description: 'Days until expiration',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'error',
            },
            code: {
              type: 'string',
              example: 'LICENSE_EXPIRED',
            },
            message: {
              type: 'string',
              example: 'License has expired',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        BadRequestError: {
          description: 'Invalid request parameters',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        TooManyRequestsError: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Licenses',
        description: 'License management endpoints',
      },
      {
        name: 'Features',
        description: 'Feature management endpoints',
      },
      {
        name: 'Analytics',
        description: 'License usage analytics endpoints',
      },
      {
        name: 'Security',
        description: 'License security endpoints',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts'],
};

// Generate Swagger specs
export const specs = swaggerJsdoc(options);

// Get markdown documentation
export const markdownDocs = getMarkdownDocs();

// Generate HTML documentation
export const docsHtml = generateSwaggerHtml(markdownDocs as any);

// Export custom CSS
export const customCss = swaggerCustomCss;