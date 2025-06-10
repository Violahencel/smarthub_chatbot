import { ObjectId } from 'mongodb';

/**
 * Type definition for shared data in memory store
 */
export interface SharedData {
  id: string;
  type: 'string' | 'image' | 'document' | 'json';
  content: string; // For memory storage or preview
  filePath?: string; // Path to the stored file
  timestamp: number;
  senderId: string;
}

/**
 * Metadata structure for a file stored in the system
 */
export interface SharedDataMetadata {
  id: string;
  type: 'string' | 'image' | 'document' | 'json';
  filePath: string;
  timestamp: number;
  senderId: string;
  originalSize: number;
}

/**
 * MongoDB model for shared data
 */
export interface SharedDataModel {
  _id?: ObjectId;
  dataId: string;
  type: string;
  filePath: string;
  timestamp: number;
  senderId: string;
  originalSize: number;
  metadata?: {
    filename?: string;
    contentType?: string;
    size?: number;
  };
  createdAt: number;
}

/**
 * Response format for file upload API
 */
export interface FileUploadResponse {
  success: boolean;
  dataId: string;
  type: string;
  filename: string;
  error?: string;
} 