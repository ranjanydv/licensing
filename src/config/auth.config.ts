import dotenv from 'dotenv';

dotenv.config();

export const authConfig = {
	jwt: {
		accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret_key_change_in_production',
		refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_key_change_in_production',
		accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
		refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
	},
	password: {
		saltRounds: 10,
		minLength: 8,
	},
	rateLimiting: {
		windowMs: 15 * 60 * 1000, // 15 minutes
		max: 100, // limit each IP to 100 requests per windowMs
		message: 'Too many requests from this IP, please try again later',
	},
	roles: {
		admin: 'admin',
		support: 'support',
	},
	permissions: {
		user: {
			create: 'user:create',
			read: 'user:read',
			update: 'user:update',
			delete: 'user:delete',
		},
		role: {
			create: 'role:create',
			read: 'role:read',
			update: 'role:update',
			delete: 'role:delete',
		},
	},
};