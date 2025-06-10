import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './UI/dialog';
import { Button } from './UI/button';
import { Progress } from './UI/progress';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (records: any[]) => void;
  title?: string;
  folderPath?: string;
  maxFileSize?: number;
  allowedTypes?: string[];
  multiple?: boolean;
}

export function FileUploadModal({ 
  isOpen, 
  onClose, 
  onUploadComplete,
  title = 'Upload PDF Files',
  folderPath = 'aido_order_files',
  maxFileSize = 5 * 1024 * 1024, // 0MB default
  allowedTypes = ['application/pdf'],
  multiple = true
}: FileUploadModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  // Clear files when modal opens
  useEffect(() => {
    if (isOpen) {
      setFiles([]);
      setProgress(0);
    }
  }, [isOpen]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const validFiles = selectedFiles.filter(file => 
      allowedTypes.includes(file.type) && 
      file.size <= maxFileSize
    );
    setFiles(validFiles);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('folder', folderPath);

    try {
      const response = await fetch('/api/aido-order/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onUploadComplete(data.records);
      onClose();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
      setProgress(100);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title} Max File Size: {(maxFileSize / (1024 * 1024)).toFixed(2)} MB</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <input
            type="file"
            accept={allowedTypes.join(',')}
            multiple={multiple}
            onChange={handleFileSelect}
            className="w-full"
            disabled={uploading}
          />
          {files.length > 0 && (
            <div className="space-y-2">
              <p>Selected files:</p>
              <ul className="list-disc pl-5">
                {files.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-gray-500">Uploading...</p>
            </div>
          )}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={files.length === 0 || uploading}>
              Upload
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 