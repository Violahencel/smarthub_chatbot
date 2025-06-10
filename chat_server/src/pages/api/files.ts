import { NextApiRequest, NextApiResponse } from 'next';
import { FileAccessManager } from '@/lib/file_access_manager';
import path from 'path';
import fs from 'fs';

// Initialize FileAccessManager with environment variables
const fileManager = new FileAccessManager(process.env.DIRECTORY_BROWSING_PATH || '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { path: filePath, download, zip, content } = req.query;

    // Validate environment variables
    if (!process.env.DIRECTORY_BROWSING_PATH) {
      console.error('DIRECTORY_BROWSING_PATH is not configured');
      return res.status(500).json({ error: 'DIRECTORY_BROWSING_PATH is not configured' });
    }
    // if (!process.env.STATIC_FILE_BASE_URL) {
    //   return res.status(500).json({ error: 'STATIC_FILE_BASE_URL is not configured' });
    // }

    // Check if directory exists and is accessible
    try {
      const baseDir = process.env.DIRECTORY_BROWSING_PATH;
      console.log('Checking directory:', baseDir);
      
      if (!fs.existsSync(baseDir)) {
        console.error('Directory does not exist:', baseDir);
        return res.status(500).json({ error: `Directory does not exist: ${baseDir}` });
      }

      // Try to read the directory to check permissions
      fs.readdirSync(baseDir);
      console.log('Directory is accessible:', baseDir);

      // If content is requested, return the file content
      if (content === 'true' && filePath) {
        const fullPath = path.join(baseDir, filePath as string);
        if (!fs.existsSync(fullPath)) {
          return res.status(404).json({ error: 'File not found' });
        }
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          return res.status(400).json({ error: 'Cannot read content of a directory' });
        }

        // Check if it's a text file
        const ext = path.extname(fullPath).toLowerCase();
        const textExtensions = ['.txt', '.json', '.yml', '.yaml', '.md', '.js', '.ts', '.html', '.css', '.xml', '.csv', '.log'];
        
        if (textExtensions.includes(ext)) {
          try {
            const fileContent = fs.readFileSync(fullPath, 'utf8');
            return res.status(200).json({ content: fileContent });
          } catch (error) {
            console.error('Error reading file:', error);
            return res.status(500).json({ error: 'Failed to read file content' });
          }
        } else {
          return res.status(400).json({ error: 'File type not supported for content preview' });
        }
      }

      // If download is requested, stream the file
      if (download) {
        const fileStream = fileManager.createReadStream(filePath as string);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath as string)}"`);
        fileStream.pipe(res);
      } else if (zip) {
        // Download directory as zip
        const zipBuffer = await fileManager.createZipArchive(filePath as string);
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath as string)}.zip"`);
        res.send(zipBuffer);
      } else {
        // List directory contents
        console.log('Listing directory:', filePath || 'root');
        const result = fileManager.listDirectory(filePath as string);
        return res.status(200).json(result);
      }
    } catch (error: any) {
      console.error('File system error:', error);
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  } 
  else if (req.method === 'DELETE') {
    const { path: folder } = req.query;
    const { paths } = req.body;
    try {
      if (paths && Array.isArray(paths)) {
        for (const path of paths) {
          await fileManager.deleteFolder(path as string);
        }
      } else {
        await fileManager.deleteFolder(folder as string);
      }
      return res.status(200).json({ message: 'File deleted successfully' });
    } catch (error: any) {
      console.error('File deletion error:', error);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }

  else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
} 