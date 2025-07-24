import { Request } from 'express';
import { Types } from 'mongoose';

export interface IUser {
	_id: string;
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
	role: string;
	isActive: boolean;
	lastLogin?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface IRole {
	// _id: Types.ObjectId;
	id: string;
	name: string; // 'admin' or 'support'
	permissions: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface ITokenBlacklist {
	token: string;
	expiresAt: Date;
	createdAt: Date;
}

export interface DecodedToken {
	userId: string;
	email: string;
	role: string;
	iat?: number;
	exp?: number;
}

export interface AuthTokens {
	accessToken: string;
	refreshToken: string;
}

// DTOs
export interface RegisterDTO {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
}

export interface LoginDTO {
	email: string;
	password: string;
}

export interface AuthResponseDTO {
	user: {
		id: string;
		email: string;
		firstName?: string;
		lastName?: string;
		role: string;
	};
	tokens: AuthTokens;
}

export interface CreateUserDTO {
	email: string;
	password: string;
	firstName?: string;
	lastName?: string;
	role: string;
}

export interface UpdateUserDTO {
	email?: string;
	firstName?: string;
	lastName?: string;
	isActive?: boolean;
	role?: string;
}

export interface CreateRoleDTO {
	name: string;
	permissions: string[];
}

export interface UpdateRoleDTO {
	name?: string;
	permissions?: string[];
}

// Extend Express Request interface to include user
export interface AuthRequest extends Request {
	user?: {
		id: string;
		email: string;
		role: string;
	};
}