import { 
  encrypt, 
  decrypt, 
  encryptObject, 
  decryptObject 
} from '../../utils/encryption';

// Mock environment variables
process.env.LICENSE_HASH_SECRET = 'test_license_hash_secret';

describe('Encryption Utilities', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', () => {
      const originalData = 'sensitive data to encrypt';
      
      const { iv, tag, encryptedData } = encrypt(originalData);
      
      expect(iv).toBeDefined();
      expect(tag).toBeDefined();
      expect(encryptedData).toBeDefined();
      expect(encryptedData).not.toBe(originalData);
      
      const decryptedData = decrypt(encryptedData, iv, tag);
      
      expect(decryptedData).toBe(originalData);
    });
    
    it('should encrypt the same data to different ciphertexts (due to random IV)', () => {
      const originalData = 'sensitive data to encrypt';
      
      const result1 = encrypt(originalData);
      const result2 = encrypt(originalData);
      
      expect(result1.encryptedData).not.toBe(result2.encryptedData);
      expect(result1.iv).not.toBe(result2.iv);
    });
    
    it('should throw an error if encryption key is not defined', () => {
      const originalSecret = process.env.LICENSE_HASH_SECRET;
      delete process.env.LICENSE_HASH_SECRET;
      
      expect(() => encrypt('test data')).toThrow();
      
      // Restore the environment variable
      process.env.LICENSE_HASH_SECRET = originalSecret;
    });
    
    it('should throw an error if decryption fails', () => {
      const originalData = 'sensitive data to encrypt';
      const { iv, tag, encryptedData } = encrypt(originalData);
      
      // Tamper with the encrypted data
      const tamperedData = encryptedData.replace(/^./, 'X');
      
      expect(() => decrypt(tamperedData, iv, tag)).toThrow();
    });
    
    it('should work with a custom encryption key', () => {
      const originalData = 'sensitive data to encrypt';
      const customKey = 'my_custom_encryption_key';
      
      const { iv, tag, encryptedData } = encrypt(originalData, customKey);
      const decryptedData = decrypt(encryptedData, iv, tag, customKey);
      
      expect(decryptedData).toBe(originalData);
    });
  });
  
  describe('encryptObject and decryptObject', () => {
    it('should encrypt and decrypt objects correctly', () => {
      const originalObject = {
        id: 123,
        name: 'Test Object',
        nested: {
          value: 'nested value',
          array: [1, 2, 3]
        }
      };
      
      const encryptedString = encryptObject(originalObject);
      
      expect(encryptedString).toBeDefined();
      expect(typeof encryptedString).toBe('string');
      
      const decryptedObject = decryptObject<typeof originalObject>(encryptedString);
      
      expect(decryptedObject).toEqual(originalObject);
      expect(decryptedObject.id).toBe(originalObject.id);
      expect(decryptedObject.nested.value).toBe(originalObject.nested.value);
      expect(decryptedObject.nested.array).toEqual(originalObject.nested.array);
    });
    
    it('should work with a custom encryption key', () => {
      const originalObject = { id: 123, name: 'Test Object' };
      const customKey = 'my_custom_encryption_key';
      
      const encryptedString = encryptObject(originalObject, customKey);
      const decryptedObject = decryptObject<typeof originalObject>(encryptedString, customKey);
      
      expect(decryptedObject).toEqual(originalObject);
    });
  });
});