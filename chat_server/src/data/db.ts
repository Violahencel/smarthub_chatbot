import { MongoClient, Db } from 'mongodb';
import { dbConfig } from './config';

// Connection URL and options from config
const url = dbConfig.mongoUri;
const dbName = dbConfig.dbName;
const options = dbConfig.options;

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Connect to MongoDB and return the client and database objects
 * Uses a connection cache to avoid creating multiple connections
 */
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  // If we have cached connections, use them
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  try {
    // Connect to MongoDB
    const client = await MongoClient.connect(url);
    const db = client.db(dbName);

    // Cache the client and db connection
    cachedClient = client;
    cachedDb = db;

    console.log('Connected to MongoDB');
    return { client, db };
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Close MongoDB connection
 * Useful for cleanup during testing or server shutdown
 */
export async function closeConnection(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
    console.log('MongoDB connection closed');
  }
} 