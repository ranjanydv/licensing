import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Global MongoDB instance
let mongoServer: MongoMemoryServer;

// Setup before all tests
beforeAll(async () => {
	// Create an in-memory MongoDB server
	mongoServer = await MongoMemoryServer.create();
	const mongoUri = mongoServer.getUri();

	// Connect to the in-memory database
	await mongoose.connect(mongoUri);
});

// Clean up after each test
afterEach(async () => {
	// Clear all collections
	const collections = mongoose.connection.collections;
	for (const key in collections) {
		const collection = collections[key];
		await collection.deleteMany({});
	}
});

// Clean up after all tests
afterAll(async () => {
	// Disconnect from MongoDB
	await mongoose.disconnect();

	// Stop the MongoDB server
	await mongoServer.stop();
});

// Mock environment variables for testing
process.env.JWT_SECRET = 'test_jwt_secret';
process.env.LICENSE_HASH_SECRET = 'test_license_hash_secret';
process.env.NODE_ENV = 'test';