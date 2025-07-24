import mongoose, { Schema, Document } from 'mongoose';
import { hashPassword, verifyPassword } from '../utils/hash';
import { IUser } from '../interfaces/auth.interface';

export type UserDocument = IUser & Document & {
	comparePassword(candidatePassword: string): Promise<boolean>;
	fullName: string;
};

const UserSchema: Schema = new Schema({
	email: {
		type: String,
		required: [true, 'Email is required'],
		unique: true,
		lowercase: true,
		trim: true,
		match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
	},
	password: {
		type: String,
		required: [true, 'Password is required'],
		minlength: [8, 'Password must be at least 8 characters long']
	},
	firstName: {
		type: String,
		trim: true
	},
	lastName: {
		type: String,
		trim: true
	},
	role: {
		type: Schema.Types.ObjectId,
		ref: 'Role',
		required: true
	},
	isActive: {
		type: Boolean,
		default: true
	},
	lastLogin: {
		type: Date
	}
}, {
	timestamps: true
});

// Pre-save hook to hash password
UserSchema.pre('save', async function (next) {
	const user = this as UserDocument;

	// Only hash the password if it has been modified (or is new)
	if (!user.isModified('password')) return next();

	try {
		user.password = await hashPassword(user.password);
		next();
	} catch (error) {
		next(error as Error);
	}
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
	return verifyPassword(this.password, candidatePassword);
};

// Virtual for user's full name
UserSchema.virtual('fullName').get(function (this: UserDocument) {
	if (this.firstName && this.lastName) {
		return `${this.firstName} ${this.lastName}`;
	}
	return this.firstName || this.lastName || '';
});

// Transform the output to remove sensitive data
UserSchema.set('toJSON', {
	transform: (_doc: any, ret: any) => {
		delete ret.password;
		return ret;
	}
});

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);