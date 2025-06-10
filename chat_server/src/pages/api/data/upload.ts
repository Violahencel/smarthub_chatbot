import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import formidable from 'formidable';
import { IncomingForm } from 'formidable';
import { SharedDataRepository } from '../../../data/models/SharedData';
import { SharedData, FileUploadResponse } from '../../../types/shared-data';

// Configure API to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Constants
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'shared_data');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Helper function to ensure data directory exists
async function ensureDataDirExists() {
  try {
    await fsPromises.access(DATA_DIR);
  } catch (error) {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
    console.log(`Created data directory: ${DATA_DIR}`);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FileUploadResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      dataId: '',
      type: '',
      filename: '',
      error: 'Method not allowed' 
    });
  }
  
  try {
    // Ensure data directory exists
    await ensureDataDirExists();
    
    // Parse the multipart form data
    const form = new IncomingForm({
      multiples: false,
      keepExtensions: true,
    });
    
    const formData: any = await new Promise((resolve, reject) => {
      form.parse(req, (err: Error | null, fields: formidable.Fields, files: formidable.Files) => {
        if (err) {
          reject(err);
          return;
        }
        resolve({ fields, files });
      });
    });
    
    const { fields, files } = formData;
    const file = files.file?.[0] || files.file; // Handle formidable v4 array or older versions
    
    if (!file) {
      return res.status(400).json({ 
        success: false,
        dataId: '',
        type: '',
        filename: '',
        error: 'No file uploaded' 
      });
    }
    
    const channelId = fields.channelId?.[0] || fields.channelId || 'general';
    const senderId = fields.senderId?.[0] || fields.senderId || 'admin';
    
    // Generate a unique ID for the data
    const dataId = `data_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Determine file type based on mime type
    let type: 'string' | 'image' | 'document' | 'json' = 'document';
    const mimeType = file.mimetype || '';
    
    if (mimeType.startsWith('image/')) {
      type = 'image';
    } else if (mimeType === 'application/json') {
      type = 'json';
    } else if (mimeType === 'application/pdf') {
      type = 'document';
    } else if (mimeType.includes('text/')) {
      type = 'string';
    }
    
    // Determine file extension
    let fileExt = '.txt';
    if (type === 'json') fileExt = '.json';
    else if (type === 'image') {
      // Extract from filename if available
      const originalExt = path.extname(file.originalFilename || '');
      fileExt = originalExt || '.png';
    }
    else if (type === 'document') fileExt = '.pdf';
    
    // Create the destination file path (local)
    const fileName = `${dataId}${fileExt}`;
    const filePath = path.join(DATA_DIR, fileName);
    
    // Create the full URL path for storage in metadata
    const fileUrl = `${SERVER_URL}/api/data/files/${fileName}`;
    
    // Move the uploaded file to our storage
    const fileData = await fsPromises.readFile(file.filepath);
    await fsPromises.writeFile(filePath, fileData);
    
    // Clean up temp file
    await fsPromises.unlink(file.filepath);
    
    // Create an instance of the repository
    const sharedDataRepo = new SharedDataRepository();
    
    // Create and save metadata to MongoDB
    const metadataItem = {
      dataId,
      type,
      filePath: fileUrl, // Store the full URL
      timestamp: Date.now(),
      senderId,
      originalSize: file.size || 0,
      createdAt: Date.now(),
      metadata: {
        filename: file.originalFilename || `file${fileExt}`,
        contentType: file.mimetype || '',
        size: file.size || 0
      }
    };
    
    // Save to MongoDB
    await sharedDataRepo.saveData(metadataItem);
    
    // Add to in-memory store as well if it exists (for backward compatibility)
    const sharedDataStore = (global as any).sharedDataStore as Map<string, SharedData>;
    
    if (sharedDataStore) {
      let content = '';
      // Only read content for strings or JSON for in-memory cache
      if (type === 'string' || type === 'json') {
        content = (await fsPromises.readFile(filePath)).toString('utf8');
      }
      
      const sharedData: SharedData = {
        id: dataId,
        type,
        content,
        filePath: fileUrl,
        timestamp: metadataItem.timestamp,
        senderId: metadataItem.senderId
      };
      
      sharedDataStore.set(dataId, sharedData);
    }
    
    // Return success with the data ID
    return res.status(200).json({
      success: true,
      dataId,
      type,
      filename: file.originalFilename || `file${fileExt}`
    });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return res.status(500).json({ 
      success: false,
      dataId: '',
      type: '',
      filename: '',
      error: error.message || 'Unknown error' 
    });
  }
} 