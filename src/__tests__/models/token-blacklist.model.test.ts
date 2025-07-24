import mongoose from 'mongoose';
import { TokenBlacklistModel } from '../../models/token-blacklist.model';

describe('TokenBlacklist Model', () => {
	const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

	// Create a date 1 hour in the future
	const futureDate = new Date();
	futureDate.setHours(futureDate.getHours() + 1);

	const mockTokenBlacklistData = {
		token: mockToken,
		expiresAt: futureDate
	};

	afterEach(async () => {
		await TokenBlacklistModel.deleteMany({});
	});

	it('should create a token blacklist entry successfully', async () => {
		const tokenBlacklist = new TokenBlacklistModel(mockTokenBlacklistData);
		const savedTokenBlacklist = await tokenBlacklist.save();

		expect(savedTokenBlacklist._id).toBeDefined();
		expect(savedTokenBlacklist.token).toBe(mockToken);
		expect(savedTokenBlacklist.expiresAt).toEqual(futureDate);
		expect(savedTokenBlacklist.createdAt).toBeDefined();
		expect(savedTokenBlacklist.updatedAt).toBeDefined();
	});

	it('should require token field', async () => {
		const tokenBlacklistWithoutToken = new TokenBlacklistModel({
			...mockTokenBlacklistData,
			token: undefined
		});

		await expect(tokenBlacklistWithoutToken.save()).rejects.toThrow();
	});

	it('should require expiresAt field', async () => {
		const tokenBlacklistWithoutExpiration = new TokenBlacklistModel({
			...mockTokenBlacklistData,
			expiresAt: undefined
		});

		await expect(tokenBlacklistWithoutExpiration.save()).rejects.toThrow();
	});

	it('should not allow duplicate tokens', async () => {
		// Create first token blacklist entry
		const firstTokenBlacklist = new TokenBlacklistModel(mockTokenBlacklistData);
		await firstTokenBlacklist.save();

		// Try to create another entry with the same token
		const duplicateTokenBlacklist = new TokenBlacklistModel({
			token: mockToken,
			expiresAt: new Date(futureDate.getTime() + 1000) // Different expiration
		});

		await expect(duplicateTokenBlacklist.save()).rejects.toThrow();
	});

	// Note: We can't directly test the TTL index expiration in a unit test
	// as it requires waiting for MongoDB's background process to run.
	// This would be better tested in an integration test with time manipulation.
});