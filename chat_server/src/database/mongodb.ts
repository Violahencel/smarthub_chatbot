import { MongoClient, Db } from 'mongodb';

// Connection URL
const url = process.env.MONGODB_URI || 'mongodb://localhost:27017';
// Database Name
const dbName = process.env.MONGODB_DB || 'chat_admin';

// Connection cache
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

/**
 * Connects to MongoDB and returns the client and database
 * @returns MongoDB client and database
 */
export async function connectToDatabase() {
  // If we already have a connection, use it
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  // Connect to MongoDB
  const client = await MongoClient.connect(url);
  const db = client.db(dbName);

  // Create indexes if needed
  await createIndexes(db);

  // Cache the connection
  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

/**
 * Creates necessary indexes in the database
 * @param db MongoDB database
 */
async function createIndexes(db: Db) {
  // Create text index for prompts collection
  await db.collection('prompts').createIndex(
    { title: 'text', description: 'text', tags: 'text' },
    { background: true }
  );

  // Create indexes for common queries
  await db.collection('prompts').createIndex(
    { tags: 1 },
    { background: true }
  );

  await db.collection('prompts').createIndex(
    { createdAt: -1 },
    { background: true }
  );

  await db.collection('prompts').createIndex(
    { isActive: 1 },
    { background: true }
  );
} 