import fs from 'fs/promises';
import path from 'path';
import { PromptFileInfo } from '../types/prompt';

/**
 * Manages the storage and retrieval of prompt files
 */
export class PromptFileManager {
  private basePath: string;
  private baseUrl: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'data', 'prompts');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    
    // Ensure the prompts directory exists
    this.ensureDirectoryExists();
  }

  /**
   * Ensures the prompts directory exists
   */
  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Error creating prompts directory:', error);
    }
  }

  /**
   * Saves a prompt file to disk
   * @param id The prompt ID
   * @param content The prompt content
   * @returns File information
   */
  async savePromptFile(id: string, content: string): Promise<PromptFileInfo> {
    const filePath = path.join(this.basePath, `${id}.txt`);
    const fileUrl = `${this.baseUrl}/api/prompts/content/${id}`;
    
    // Write the file
    await fs.writeFile(filePath, content, 'utf8');
    
    // Get file stats
    const stats = await fs.stat(filePath);
    
    return {
      filePath,
      fileUrl,
      fileSize: stats.size,
      contentType: 'text/plain'
    };
  }

  /**
   * Reads a prompt file from disk
   * @param id The prompt ID
   * @returns The prompt content
   */
  async getPromptContent(id: string): Promise<string> {
    const filePath = path.join(this.basePath, `${id}.txt`);
    
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`Error reading prompt file ${id}:`, error);
      throw new Error(`Prompt file not found: ${id}`);
    }
  }

  /**
   * Updates a prompt file on disk
   * @param id The prompt ID
   * @param content The new prompt content
   * @returns Updated file information
   */
  async updatePromptFile(id: string, content: string): Promise<PromptFileInfo> {
    // This is essentially the same as saving a new file
    return this.savePromptFile(id, content);
  }

  /**
   * Deletes a prompt file from disk
   * @param id The prompt ID
   * @returns Success status
   */
  async deletePromptFile(id: string): Promise<boolean> {
    const filePath = path.join(this.basePath, `${id}.txt`);
    
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      console.error(`Error deleting prompt file ${id}:`, error);
      return false;
    }
  }
} 