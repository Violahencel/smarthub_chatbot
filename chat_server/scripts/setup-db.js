/**
 * MongoDB Database Setup Script
 * 
 * This script sets up the MongoDB database with necessary collections and indexes.
 * Run this script before starting the application for the first time.
 */

// Import the setup function from the compiled TypeScript
const path = require('path');

console.log('Starting MongoDB database setup...');

// We need to handle both compiled and source code paths
try {
  // Try the compiled path first (after running npm run build:db)
  const { setupDatabase } = require('../dist/data/setup');
  
  setupDatabase()
    .then(() => {
      console.log('Database setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Database setup failed:', error);
      process.exit(1);
    });
} catch (error) {
  try {
    // Fall back to the ts-node for direct TypeScript execution
    require('ts-node/register');
    const { setupDatabase } = require('../src/data/setup');
    
    console.log('Using ts-node to run setup directly from TypeScript');
    setupDatabase()
      .then(() => {
        console.log('Database setup completed successfully');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Database setup failed:', error);
        process.exit(1);
      });
  } catch (innerError) {
    console.error('Failed to run setup script:', innerError);
    console.error('Original error:', error);
    console.error('Make sure to run "npm run build:db" first, or install ts-node');
    process.exit(1);
  }
} 