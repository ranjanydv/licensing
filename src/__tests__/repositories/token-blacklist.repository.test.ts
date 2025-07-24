import { TokenBlacklistModel } from '../../models/token-blacklist.model';
import { tokenBlacklistRepository } from '../../repositories/token-blacklist.repository';

describe('TokenBlacklistRepository', () => {
  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const mockExpiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ODc2NTQzMjEwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.TDvALSGNAQRUFIDJMQWRQJGFWJKLKDJFLSKDJFLSKJDF';
  
  // Create a date 1 hour in the future
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 1);
  
  // Create a date 1 hour in the past
  const pastDate = new Date();
  pastDate.setHours(pastDate.getHours() - 1);
  
  const mockTokenBlacklistData = {
    token: mockToken,
    expiresAt: futureDate
  };

  const mockExpiredTokenData = {
    token: mockExpiredToken,
    expiresAt: pastDate
  };

  afterEach(async () => {
    await TokenBlacklistModel.deleteMany({});
  });

  describe('create', () => {
    it('should create a token blacklist entry successfully', async () => {
      const tokenBlacklist = await tokenBlacklistRepository.create(mockTokenBlacklistData);
      
      expect(tokenBlacklist._id).toBeDefined();
      expect(tokenBlacklist.token).toBe(mockToken);
      expect(tokenBlacklist.expiresAt).toEqual(futureDate);
    });
  });

  describe('isBlacklisted', () => {
    it('should return true if token is blacklisted', async () => {
      await tokenBlacklistRepository.create(mockTokenBlacklistData);
      
      const isBlacklisted = await tokenBlacklistRepository.isBlacklisted(mockToken);
      
      expect(isBlacklisted).toBe(true);
    });

    it('should return false if token is not blacklisted', async () => {
      const isBlacklisted = await tokenBlacklistRepository.isBlacklisted('nonexistent-token');
      
      expect(isBlacklisted).toBe(false);
    });
  });

  describe('addToBlacklist', () => {
    it('should add a token to the blacklist', async () => {
      const tokenBlacklist = await tokenBlacklistRepository.addToBlacklist(mockToken, futureDate);
      
      expect(tokenBlacklist._id).toBeDefined();
      expect(tokenBlacklist.token).toBe(mockToken);
      expect(tokenBlacklist.expiresAt).toEqual(futureDate);
      
      // Verify it's in the blacklist
      const isBlacklisted = await tokenBlacklistRepository.isBlacklisted(mockToken);
      expect(isBlacklisted).toBe(true);
    });

    it('should throw an error when adding a duplicate token', async () => {
      await tokenBlacklistRepository.addToBlacklist(mockToken, futureDate);
      
      await expect(
        tokenBlacklistRepository.addToBlacklist(mockToken, new Date(futureDate.getTime() + 1000))
      ).rejects.toThrow();
    });
  });

  describe('cleanExpiredTokens', () => {
    it('should clean expired tokens', async () => {
      // Add both valid and expired tokens
      await tokenBlacklistRepository.create(mockTokenBlacklistData);
      await tokenBlacklistRepository.create(mockExpiredTokenData);
      
      // Verify both tokens are in the database
      let count = await tokenBlacklistRepository.count();
      expect(count).toBe(2);
      
      // Clean expired tokens
      const deletedCount = await tokenBlacklistRepository.cleanExpiredTokens();
      
      // Verify only expired token was removed
      expect(deletedCount).toBe(1);
      
      count = await tokenBlacklistRepository.count();
      expect(count).toBe(1);
      
      // Verify the remaining token is the non-expired one
      const isStillBlacklisted = await tokenBlacklistRepository.isBlacklisted(mockToken);
      expect(isStillBlacklisted).toBe(true);
      
      const isExpiredStillBlacklisted = await tokenBlacklistRepository.isBlacklisted(mockExpiredToken);
      expect(isExpiredStillBlacklisted).toBe(false);
    });

    it('should return 0 if no expired tokens', async () => {
      // Add only valid token
      await tokenBlacklistRepository.create(mockTokenBlacklistData);
      
      // Clean expired tokens
      const deletedCount = await tokenBlacklistRepository.cleanExpiredTokens();
      
      // Verify no tokens were removed
      expect(deletedCount).toBe(0);
      
      const count = await tokenBlacklistRepository.count();
      expect(count).toBe(1);
    });
  });

  describe('CRUD operations', () => {
    it('should find a token blacklist entry by ID', async () => {
      const createdEntry = await tokenBlacklistRepository.create(mockTokenBlacklistData);
      
      const entry = await tokenBlacklistRepository.findById(createdEntry._id.toString());
      
      expect(entry).not.toBeNull();
      expect(entry?._id.toString()).toBe(createdEntry._id.toString());
    });

    it('should find all token blacklist entries', async () => {
      await tokenBlacklistRepository.create(mockTokenBlacklistData);
      await tokenBlacklistRepository.create({
        token: 'another-token',
        expiresAt: futureDate
      });
      
      const entries = await tokenBlacklistRepository.findAll();
      
      expect(entries).toHaveLength(2);
    });

    it('should delete a token blacklist entry', async () => {
      const createdEntry = await tokenBlacklistRepository.create(mockTokenBlacklistData);
      
      const deleted = await tokenBlacklistRepository.delete(createdEntry._id.toString());
      
      expect(deleted).toBe(true);
      
      const entry = await tokenBlacklistRepository.findById(createdEntry._id.toString());
      expect(entry).toBeNull();
    });
  });
});