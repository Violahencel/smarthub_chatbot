import { connectToDatabase, closeConnection } from './db';

/**
 * Setup the MongoDB database with necessary collections and indexes
 */
export async function setupDatabase() {
  try {
    console.log('Setting up MongoDB database...');
    const { db } = await connectToDatabase();
    
    // Create collections if they don't exist
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    // Create messages collection
    if (!collectionNames.includes('messages')) {
      console.log('Creating messages collection...');
      await db.createCollection('messages');
      
      // Create indexes for messages
      const messagesCollection = db.collection('messages');
      await messagesCollection.createIndex({ channelId: 1, timestamp: 1 });
      await messagesCollection.createIndex({ id: 1 }, { unique: true });
      await messagesCollection.createIndex({ requestId: 1 });
      await messagesCollection.createIndex({ parentRequestId: 1 });
      console.log('Created messages collection and indexes');
    }
    
    // Create channels collection
    if (!collectionNames.includes('channels')) {
      console.log('Creating channels collection...');
      await db.createCollection('channels');
      
      // Create indexes for channels
      const channelsCollection = db.collection('channels');
      await channelsCollection.createIndex({ channelId: 1 }, { unique: true });
      console.log('Created channels collection and indexes');
    }
    
    // Create shared_data collection
    if (!collectionNames.includes('shared_data')) {
      console.log('Creating shared_data collection...');
      await db.createCollection('shared_data');
      
      // Create indexes for shared_data
      const sharedDataCollection = db.collection('shared_data');
      await sharedDataCollection.createIndex({ dataId: 1 }, { unique: true });
      console.log('Created shared_data collection and indexes');
    }
    
    console.log('Database setup complete');
    return true;
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    // Close the database connection
    await closeConnection();
  }
}

// Execute the setup if run directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
} 