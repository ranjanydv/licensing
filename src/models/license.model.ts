import mongoose, { Schema, Document } from 'mongoose';
import { License, LicenseStatus, Feature } from '../interfaces/license.interface';

/**
 * Feature schema for MongoDB
 */
const FeatureSchema = new Schema<Feature>({
	name: {
		type: String,
		required: true
	},
	enabled: {
		type: Boolean,
		default: true
	},
	restrictions: {
		type: Schema.Types.Mixed,
		default: {}
	}
}, { _id: false });

/**
 * Hardware binding schema for MongoDB
 */
const HardwareBindingSchema = new Schema({
	enabled: {
		type: Boolean,
		default: false
	},
	fingerprints: {
		type: [String],
		default: []
	}
}, { _id: false });

/**
 * IP restrictions schema for MongoDB
 */
const IpRestrictionsSchema = new Schema({
	enabled: {
		type: Boolean,
		default: false
	},
	allowedIps: {
		type: [String],
		default: []
	},
	allowedCountries: {
		type: [String],
		default: []
	}
}, { _id: false });

/**
 * Device limit schema for MongoDB
 */
const DeviceLimitSchema = new Schema({
	enabled: {
		type: Boolean,
		default: false
	},
	maxDevices: {
		type: Number,
		default: 1
	}
}, { _id: false });

/**
 * Security restrictions schema for MongoDB
 */
const SecurityRestrictionsSchema = new Schema({
	hardwareBinding: {
		type: HardwareBindingSchema,
		default: () => ({})
	},
	ipRestrictions: {
		type: IpRestrictionsSchema,
		default: () => ({})
	},
	deviceLimit: {
		type: DeviceLimitSchema,
		default: () => ({})
	}
}, { _id: false });

/**
 * License schema for MongoDB with optimized indexes
 */
const LicenseSchema = new Schema<License & Document>({
	schoolId: {
		type: String,
		required: true,
		index: true
	},
	schoolName: {
		type: String,
		required: true
	},
	licenseKey: {
		type: String,
		required: true,
		index: true
	},
	licenseToken: {
		type: String,
		required: true,
	},
	licenseHash: {
		type: String,
		required: true
	},
	features: [FeatureSchema],
	issuedAt: {
		type: Date,
		default: Date.now,
		index: true // Index for sorting by issue date
	},
	expiresAt: {
		type: Date,
		required: true,
		index: true
	},
	lastChecked: {
		type: Date,
		default: Date.now
	},
	status: {
		type: String,
		enum: Object.values(LicenseStatus),
		default: LicenseStatus.ACTIVE,
		index: true
	},
	metadata: {
		type: Schema.Types.Mixed,
		default: {}
	},
	securityRestrictions: {
		type: SecurityRestrictionsSchema,
		default: () => ({})
	},
	fingerprint: {
		type: String
	},
	blacklisted: {
		type: Boolean,
		default: false,
		index: true
	},
	blacklistReason: {
		type: String
	},
	createdBy: {
		type: String,
		required: true
	},
	updatedBy: {
		type: String,
		required: true
	}
}, {
	timestamps: true,
	toJSON: {
		transform: (_, ret) => {
			ret.id = ret._id;
			delete ret.__v;
			return ret;
		}
	}
});

// Compound indexes for performance optimization
LicenseSchema.index({ schoolId: 1, status: 1 }); // For finding active licenses by school
LicenseSchema.index({ expiresAt: 1, status: 1 }); // For finding expired or expiring licenses
LicenseSchema.index({ createdAt: -1 }); // For sorting by creation date (newest first)
LicenseSchema.index({ updatedAt: -1 }); // For sorting by update date (newest first)
LicenseSchema.index({ blacklisted: 1, status: 1 }); // For finding blacklisted active licenses
LicenseSchema.index({ 'securityRestrictions.hardwareBinding.enabled': 1 }); // For filtering by hardware binding
LicenseSchema.index({ 'securityRestrictions.ipRestrictions.enabled': 1 }); // For filtering by IP restrictions

// Virtual for checking if license is expired
LicenseSchema.virtual('isExpired').get(function (this: License & Document) {
	return this.expiresAt < new Date();
});

// Virtual for days until expiration
LicenseSchema.virtual('daysUntilExpiration').get(function (this: License & Document) {
	const now = new Date();
	const expiresAt = this.expiresAt;
	const diffTime = expiresAt.getTime() - now.getTime();
	return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save hook to update status based on expiration
LicenseSchema.pre('save', function (this: License & Document, next) {
	if (this.expiresAt < new Date() && this.status === LicenseStatus.ACTIVE) {
		this.status = LicenseStatus.EXPIRED;
	}
	next();
});

// Create and export the License model
export const LicenseModel = mongoose.model<License & Document>('License', LicenseSchema);

export default LicenseModel;