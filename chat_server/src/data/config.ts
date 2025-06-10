/**
 * Database configuration settings
 * Values are read from environment variables with sensible defaults
 */
import dotenv from 'dotenv';

dotenv.config();

export const dbConfig = {
  // MongoDB connection URI
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  
  // Database name
  dbName: process.env.MONGODB_DB || 'chat_admin',
  
  // Connection options
  options: {
    useUnifiedTopology: true,
    maxPoolSize: 10,
    minPoolSize: 1,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000,
  },
  
  // Collection names
  collections: {
    messages: 'messages',
    channels: 'channels',
    sharedData: 'shared_data',
  }
}; 