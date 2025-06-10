import type { NextApiRequest, NextApiResponse } from 'next';
import { promises as fsPromises } from 'fs';
import path from 'path';
import fs from 'fs';

// Path to the data directory and metadata file
const DATA_DIR = path.join(process.cwd(), 'shared_data');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Ensure the data directory exists
  try {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
    return res.status(500).json({ error: 'Failed to ensure data directory exists' });
  }
  
  // Handle different HTTP methods
  switch (req.method) {
    case 'GET':
      // Retrieve the metadata
      try {
        // Check if metadata file exists
        try {
          await fsPromises.access(METADATA_FILE);
        } catch (err) {
          // File doesn't exist, create it with empty array
          await fsPromises.writeFile(METADATA_FILE, JSON.stringify([], null, 2));
          console.log(`Created new metadata file at: ${METADATA_FILE}`);
        }
        
        // Read the metadata file
        const data = await fsPromises.readFile(METADATA_FILE, 'utf8');
        const metadata = JSON.parse(data);
        
        // Return the metadata with file stats for each entry
        const enhancedMetadata = await Promise.all(
          metadata.map(async (item: any) => {
            try {
              if (item.filePath && fs.existsSync(item.filePath)) {
                const stats = await fsPromises.stat(item.filePath);
                return {
                  ...item,
                  fileExists: true,
                  fileSize: stats.size,
                  lastModified: stats.mtime
                };
              } else {
                return {
                  ...item,
                  fileExists: false
                };
              }
            } catch (err) {
              return {
                ...item,
                fileExists: false,
                error: 'Failed to get file stats'
              };
            }
          })
        );
        
        return res.status(200).json({ 
          metadata: enhancedMetadata,
          count: enhancedMetadata.length,
          dataDirectory: DATA_DIR
        });
      } catch (err: any) {
        console.error('Error retrieving metadata:', err);
        return res.status(500).json({ error: `Failed to retrieve metadata: ${err.message}` });
      }
      
    case 'DELETE':
      // Delete a specific entry from metadata
      try {
        const { id } = req.query;
        
        if (!id) {
          return res.status(400).json({ error: 'Data ID is required for deletion' });
        }
        
        // Read the current metadata
        const data = await fsPromises.readFile(METADATA_FILE, 'utf8');
        const metadata = JSON.parse(data);
        
        // Find the entry to delete
        const entryIndex = metadata.findIndex((item: any) => item.id === id);
        
        if (entryIndex === -1) {
          return res.status(404).json({ error: 'Entry not found in metadata' });
        }
        
        // Store the entry for reference
        const deletedEntry = metadata[entryIndex];
        
        // Remove the entry from metadata
        metadata.splice(entryIndex, 1);
        
        // Save the updated metadata
        await fsPromises.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
        
        // Try to delete the associated file
        if (deletedEntry.filePath && fs.existsSync(deletedEntry.filePath)) {
          try {
            await fsPromises.unlink(deletedEntry.filePath);
            console.log(`Deleted file: ${deletedEntry.filePath}`);
          } catch (fileErr) {
            console.error(`Warning: Failed to delete file ${deletedEntry.filePath}:`, fileErr);
          }
        }
        
        // Remove from in-memory store too
        const sharedDataStore = (global as any).sharedDataStore as Map<string, any>;
        if (sharedDataStore && sharedDataStore.has(id as string)) {
          sharedDataStore.delete(id as string);
        }
        
        return res.status(200).json({ 
          success: true,
          message: 'Entry deleted from metadata',
          deleted: deletedEntry
        });
      } catch (err: any) {
        console.error('Error deleting metadata entry:', err);
        return res.status(500).json({ error: `Failed to delete metadata entry: ${err.message}` });
      }
      
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
} 