import mongoose, { Schema, Document } from 'mongoose';
import { License, LicenseStatus, Feature, ActivationStatus } from '../interfaces/license.interface';

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
		index: true,
		unique: true
	},
	licenseHex: {
		type: String,
		unique: true,
		sparse: true,
		index: true
	},
	features: [FeatureSchema],
	issuedAt: {
		type: Date,
		default: Date.now,
		index: true
	},
	expiresAt: {
		type: Date,
		required: true,
		index: true
	},
	activatedAt: {
		type: Date,
		index: true
	},
	lastVerificationAt: {
		type: Date,
		index: true
	},
	activationStatus: {
		type: String,
		enum: Object.values(ActivationStatus),
		default: ActivationStatus.PENDING,
		index: true
	},
	activationAttempts: {
		type: Number,
		default: 0,
		index: true
	},
	status: {
		type: String,
		enum: Object.values(LicenseStatus),
		default: LicenseStatus.PENDING,
		index: true
	},
	metadata: {
		type: Schema.Types.Mixed,
		default: {}
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

// Updated compound indexes for performance optimization
LicenseSchema.index({ schoolId: 1, activationStatus: 1 }); // For finding active licenses by school
LicenseSchema.index({ expiresAt: 1, activationStatus: 1 }); // For finding expired or expiring licenses
LicenseSchema.index({ activationStatus: 1, status: 1 }); // For filtering by activation and status
LicenseSchema.index({ lastVerificationAt: 1, activationStatus: 1 }); // For verification tracking
LicenseSchema.index({ createdAt: -1 }); // For sorting by creation date (newest first)
LicenseSchema.index({ updatedAt: -1 }); // For sorting by update date (newest first)

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
	if (this.expiresAt < new Date() && this.activationStatus === ActivationStatus.ACTIVATED) {
		this.activationStatus = ActivationStatus.EXPIRED;
	}
	next();
});

// Create and export the License model
export const LicenseModel = mongoose.model<License & Document>('License', LicenseSchema);

export default LicenseModel;