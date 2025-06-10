import { Collection, ObjectId } from 'mongodb';
import { connectToDatabase } from '../database/mongodb';
import { PromptModel, PromptCreateInput, PromptUpdateInput, PromptSearchOptions, PromptFileInfo } from '../types/prompt';
import { PromptFileManager } from '../utils/promptFileManager';

/**
 * Repository for managing prompts in the database
 */
export class PromptRepository {
  private collection: Collection<PromptModel>;
  private fileManager: PromptFileManager;
  private initialized: boolean = false;

  constructor() {
    this.fileManager = new PromptFileManager();
    this.collection = null!;
  }

  /**
   * Initializes the repository
   */
  private async initialize(): Promise<void> {
    if (!this.initialized) {
      const { db } = await connectToDatabase();
      this.collection = db.collection<PromptModel>('prompts');
      this.initialized = true;
    }
  }

  /**
   * Creates a new prompt
   * @param input The prompt creation input
   * @returns The ID of the created prompt
   */
  async create(input: PromptCreateInput): Promise<string> {
    await this.initialize();
    
    const id = new ObjectId().toString();
    
    // Save the file first
    const fileInfo = await this.fileManager.savePromptFile(id, input.content);
    
    // Then save metadata to MongoDB
    const promptData: PromptModel = {
      _id: id,
      title: input.title,
      description: input.description || '',
      fileUrl: fileInfo.fileUrl,
      filePath: fileInfo.filePath,
      fileSize: fileInfo.fileSize,
      contentType: fileInfo.contentType,
      tags: input.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: input.createdBy || 'system',
      isActive: input.isActive !== undefined ? input.isActive : true,
      version: 1,
      metadata: input.metadata || {}
    };
    
    await this.collection.insertOne(promptData as any);
    return id;
  }

  /**
   * Finds a prompt by ID
   * @param id The prompt ID
   * @returns The prompt or null if not found
   */
  async findById(id: string): Promise<PromptModel | null> {
    await this.initialize();
    return this.collection.findOne({ _id: id });
  }

  /**
   * Gets the content of a prompt
   * @param id The prompt ID
   * @returns The prompt content
   */
  async getContent(id: string): Promise<string> {
    await this.initialize();
    return this.fileManager.getPromptContent(id);
  }

  /**
   * Finds all prompts with optional filtering
   * @param options Search options
   * @returns Array of prompts
   */
  async findAll(options?: PromptSearchOptions): Promise<PromptModel[]> {
    await this.initialize();
    
    const query: any = {};
    
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    
    if (options?.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }
    
    if (options?.createdBy) {
      query.createdBy = options.createdBy;
    }
    
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    return this.collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
  }

  /**
   * Counts total prompts with the given criteria
   * @param options Search options
   * @returns The count of matching prompts
   */
  async count(options?: PromptSearchOptions): Promise<number> {
    await this.initialize();
    
    const query: any = {};
    
    if (options?.isActive !== undefined) {
      query.isActive = options.isActive;
    }
    
    if (options?.tags && options.tags.length > 0) {
      query.tags = { $in: options.tags };
    }
    
    if (options?.createdBy) {
      query.createdBy = options.createdBy;
    }
    
    return this.collection.countDocuments(query);
  }

  /**
   * Updates a prompt's metadata
   * @param id The prompt ID
   * @param updates The updates to apply
   * @returns Success status
   */
  async update(id: string, updates: PromptUpdateInput): Promise<boolean> {
    await this.initialize();
    
    const updateData: any = {
      updatedAt: new Date()
    };
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
    
    // Increment version
    updateData.$inc = { version: 1 };
    
    const result = await this.collection.updateOne(
      { _id: id },
      { $set: updateData }
    );
    
    return result.modifiedCount > 0;
  }

  /**
   * Updates a prompt's content
   * @param id The prompt ID
   * @param content The new content
   * @returns Success status
   */
  async updateContent(id: string, content: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // First, update the file
      const fileInfo = await this.fileManager.updatePromptFile(id, content);
      
      // Then update the metadata in the database
      const result = await this.collection.updateOne(
        { _id: id },
        { 
          $set: {
            fileSize: fileInfo.fileSize,
            updatedAt: new Date()
          },
          $inc: { version: 1 }
        }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error(`Error updating prompt content ${id}:`, error);
      return false;
    }
  }

  /**
   * Deletes a prompt
   * @param id The prompt ID
   * @returns Success status
   */
  async delete(id: string): Promise<boolean> {
    await this.initialize();
    
    try {
      // First try to delete the file
      await this.fileManager.deletePromptFile(id);
      
      // Then delete from the database
      const result = await this.collection.deleteOne({ _id: id });
      
      return result.deletedCount > 0;
    } catch (error) {
      console.error(`Error deleting prompt ${id}:`, error);
      return false;
    }
  }

  /**
   * Searches prompts by text
   * @param query The search query
   * @param options Additional search options
   * @returns Array of matching prompts
   */
  async search(query: string, options?: PromptSearchOptions): Promise<PromptModel[]> {
    await this.initialize();
    
    // Create a text search query
    const searchQuery: any = {
      $text: { $search: query }
    };
    
    // Add additional filters
    if (options?.isActive !== undefined) {
      searchQuery.isActive = options.isActive;
    }
    
    if (options?.tags && options.tags.length > 0) {
      searchQuery.tags = { $in: options.tags };
    }
    
    if (options?.createdBy) {
      searchQuery.createdBy = options.createdBy;
    }
    
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;
    
    return this.collection
      .find(searchQuery)
      .sort({ score: { $meta: "textScore" } })
      .skip(offset)
      .limit(limit)
      .toArray();
  }

  /**
   * Finds prompts by tags
   * @param tags Array of tags to search for
   * @returns Array of matching prompts
   */
  async findByTags(tags: string[]): Promise<PromptModel[]> {
    await this.initialize();
    
    return this.collection
      .find({ tags: { $in: tags } })
      .sort({ createdAt: -1 })
      .toArray();
  }
} 