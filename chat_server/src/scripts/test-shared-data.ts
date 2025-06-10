import { SharedDataRepository } from '../data/models/SharedData';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

/**
 * Test script for validating MongoDB integration for shared data.
 * 
 * Run with: 
 * ts-node src/scripts/test-shared-data.ts
 */
async function main() {
  try {
    console.log("Testing SharedData MongoDB integration...");
    
    // Initialize the repository
    const sharedDataRepo = new SharedDataRepository();
    
    // Create a test file
    const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'shared_data');
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
    
    const testId = `test_${Date.now().toString(36)}`;
    const testFile = path.join(DATA_DIR, `${testId}.txt`);
    const testContent = `This is a test file created at ${new Date().toISOString()}`;
    
    await fsPromises.writeFile(testFile, testContent);
    console.log(`Created test file: ${testFile}`);
    
    // Create a test URL
    const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
    const fileUrl = `${serverUrl}/api/data/files/${path.basename(testFile)}`;
    
    // Save test data to MongoDB
    const now = Date.now();
    const savedData = await sharedDataRepo.saveData({
      dataId: testId,
      type: 'string',
      filePath: fileUrl,
      timestamp: now,
      senderId: 'test-script',
      originalSize: Buffer.byteLength(testContent, 'utf8'),
      metadata: {
        filename: path.basename(testFile),
        contentType: 'text/plain',
        size: Buffer.byteLength(testContent, 'utf8')
      },
      createdAt: now
    });
    
    console.log("Saved test data to MongoDB:", savedData);
    
    // Retrieve the data by ID
    const retrievedData = await sharedDataRepo.getDataById(testId);
    console.log("Retrieved data from MongoDB:", retrievedData);
    
    // Validate data
    if (retrievedData && retrievedData.dataId === testId) {
      console.log("✅ Test PASSED: Data saved and retrieved successfully!");
    } else {
      console.error("❌ Test FAILED: Retrieved data doesn't match!");
    }
    
    // Get all data
    const allData = await sharedDataRepo.getAllData();
    console.log(`Retrieved ${allData.length} records from MongoDB`);
    
    // Clean up
    console.log("Cleaning up...");
    await sharedDataRepo.deleteData(testId);
    
    if (fs.existsSync(testFile)) {
      await fsPromises.unlink(testFile);
    }
    
    console.log("Test completed successfully!");
  } catch (error) {
    console.error("Test failed with error:", error);
  }
}

main().catch(console.error); 