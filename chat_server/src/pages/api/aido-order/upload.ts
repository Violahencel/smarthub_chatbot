import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { FILE_UPLOAD_CONFIG } from '../../../config/file-upload';
import { AidoOrderProcessing } from '../../../data/models/AidoOrderProcessing';
import { SharedDataRepository } from '../../../data/models/SharedData';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Starting file upload process...');
    
    const form = formidable({
      maxFileSize: FILE_UPLOAD_CONFIG.maxFileSize,
      filter: (part) => {
        console.log('Processing part:', part.name, part.mimetype);
        return part.mimetype === 'application/pdf';
      },
    });

    console.log('Parsing form data...');
    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('Form parsing error:', err);
          reject(err);
          return;
        }
        console.log('Form parsed successfully:', { fields, files });
        resolve([fields, files]);
      });
    });

    const folderPath = fields.folder?.[0] || 'aido_order_files';
    const uploadDir = path.join(process.cwd(), FILE_UPLOAD_CONFIG.baseUploadFolder, folderPath);

    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating upload directory:', uploadDir);
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uploadedFiles = [];
    const aidoOrder = new AidoOrderProcessing();
    const sharedDataRepo = new SharedDataRepository();

    console.log('Processing files:', files);
    // Access the files array from the files object
    const fileArray = files.files as formidable.File[];
    if (!fileArray || fileArray.length === 0) {
      console.log('No files found in request');
      return res.status(400).json({ error: 'No files were uploaded' });
    }

    for (const fileData of fileArray) {
      console.log('Processing file:', fileData.originalFilename, fileData.mimetype);
      
      // Validate file type
      if (fileData.mimetype !== 'application/pdf') {
        console.log('Skipping non-PDF file:', fileData.originalFilename);
        continue;
      }

      // Generate unique filename
      const uniqueFilename = `${Date.now()}-${fileData.originalFilename}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      console.log('Moving file to:', filePath);
      // Copy file to upload directory and then delete the original
      await fs.promises.copyFile(fileData.filepath, filePath);
      await fs.promises.unlink(fileData.filepath);

      console.log('Creating shared data record...');
      // Create shared data record
      const sharedDataRecord = await sharedDataRepo.saveData({
        dataId: uniqueFilename,
        type: 'document',
        filePath: `/api/data/${uniqueFilename}`,
        timestamp: Date.now(),
        senderId: 'system',
        originalSize: fileData.size,
        metadata: {
          filename: fileData.originalFilename || '',
          contentType: fileData.mimetype || 'application/pdf',
          size: fileData.size
        },
        createdAt: Date.now()
      });

      console.log('Creating aido order record...');
      // Create aido order record
      const records = await aidoOrder.create({
        url: `/api/data/${uniqueFilename}`,
        original_filename: fileData.originalFilename || '',
        file_type: fileData.mimetype || '',
        id: uniqueFilename,
        folder_path: folderPath
      });

      // Add the record to uploadedFiles array
      if (records && records.length > 0) {
        const record = records[0];
        uploadedFiles.push({
          url: record.url,
          original_filename: record.original_filename,
          file_type: record.file_type,
          id: record._id.toString(),
          folder_path: record.folder_path
        });
      }
      console.log('File processed successfully:', uniqueFilename);
    }

    if (uploadedFiles.length === 0) {
      console.log('No files were uploaded successfully');
      return res.status(400).json({ error: 'No valid files were uploaded' });
    }

    console.log('Upload completed successfully:', uploadedFiles);
    return res.status(200).json({ records: uploadedFiles });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 