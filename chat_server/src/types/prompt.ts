import { ObjectId } from 'mongodb';

/**
 * Represents a prompt in the database
 */
export interface PromptModel {
  _id: string;
  title: string;
  description: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  contentType: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
  version: number;
  metadata: Record<string, any>;
}

/**
 * Information about a prompt file
 */
export interface PromptFileInfo {
  filePath: string;
  fileUrl: string;
  fileSize: number;
  contentType: string;
}

/**
 * Input for creating a new prompt
 */
export interface PromptCreateInput {
  title: string;
  content: string;
  description?: string;
  tags?: string[];
  createdBy?: string;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Input for updating prompt metadata
 */
export interface PromptUpdateInput {
  title?: string;
  description?: string;
  tags?: string[];
  isActive?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Input for updating prompt content
 */
export interface PromptContentUpdateInput {
  content: string;
}

/**
 * Options for searching prompts
 */
export interface PromptSearchOptions {
  query?: string;
  tags?: string[];
  isActive?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * Response for listing prompts
 */
export interface PromptListResponse {
  prompts: PromptModel[];
  total: number;
  limit: number;
  offset: number;
} 