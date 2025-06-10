import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';

// Constants
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'shared_data');

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { filename } = req.query;
  
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Filename is required' });
  }
  
  // Prevent directory traversal attacks
  const sanitizedFilename = path.basename(filename);
  const filePath = path.join(DATA_DIR, sanitizedFilename);
  
  try {
    // Check if the file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get file stats
    const stats = await fsPromises.stat(filePath);
    
    // Determine content type based on file extension
    const fileExtension = path.extname(filePath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (fileExtension === '.png') contentType = 'image/png';
    else if (fileExtension === '.jpg' || fileExtension === '.jpeg') contentType = 'image/jpeg';
    else if (fileExtension === '.gif') contentType = 'image/gif';
    else if (fileExtension === '.webp') contentType = 'image/webp';
    else if (fileExtension === '.svg') contentType = 'image/svg+xml';
    else if (fileExtension === '.json') contentType = 'application/json';
    else if (fileExtension === '.txt') contentType = 'text/plain';
    else if (fileExtension === '.pdf') contentType = 'application/pdf';
    else if (fileExtension === '.doc' || fileExtension === '.docx') contentType = 'application/msword';
    else if (fileExtension === '.xls' || fileExtension === '.xlsx') contentType = 'application/vnd.ms-excel';
    
    // Set appropriate headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    
    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error: any) {
    console.error('Error serving file:', error);
    return res.status(500).json({ error: error.message || 'Unknown error serving file' });
  }
} 