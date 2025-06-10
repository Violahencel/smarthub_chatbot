import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../db';

export interface MessageModel {
  _id?: ObjectId;
  id: string;  // Client-side unique ID
  channelId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  content: string;
  tags: string[];
  dataId?: string | null;  // Extracted data ID from message content
  requestId?: string | null;
  parentRequestId?: string | null;
  status?: string | null;
  timestamp: number;
  isSystem?: boolean;
}

export class MessageRepository {
  private collectionName = 'messages';
  
  /**
   * Save a message to the database
   * @param message The message to save
   * @returns The saved message
   */
  async saveMessage(message: MessageModel): Promise<MessageModel> {
    const { db } = await connectToDatabase();
    const collection = db.collection<MessageModel>(this.collectionName);
    
    // Check if message with this id already exists
    const existing = await collection.findOne({ id: message.id });
    
    if (existing) {
      // Update existing message
      await collection.updateOne(
        { id: message.id },
        { $set: message }
      );
      return message;
    } else {
      // Insert new message
      await collection.insertOne(message);
      return message;
    }
  }
  
  /**
   * Get messages for a specific channel
   * @param channelId The channel ID
   * @param limit Maximum number of messages to return
   * @param skip Number of messages to skip
   * @returns Array of messages
   */
  async getByChannel(channelId: string, limit: number = 100, skip: number = 0): Promise<MessageModel[]> {
    const { db } = await connectToDatabase();
    const collection = db.collection<MessageModel>(this.collectionName);
    
    return collection.find({ channelId })
      .sort({ timestamp: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }
  
  /**
   * Get requests with their responses
   * @param limit Maximum number of requests to return
   * @param skip Number of requests to skip
   * @returns Array of request messages
   */
  async getRequests(limit: number = 50, skip: number = 0): Promise<MessageModel[]> {
    const { db } = await connectToDatabase();
    const collection = db.collection<MessageModel>(this.collectionName);
    
    return collection.find({ requestId: { $ne: null } })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();
  }
  
  /**
   * Get responses for a specific request
   * @param requestId The request ID
   * @returns Array of response messages
   */
  async getResponsesForRequest(requestId: string): Promise<MessageModel[]> {
    const { db } = await connectToDatabase();
    const collection = db.collection<MessageModel>(this.collectionName);
    
    return collection.find({ parentRequestId: requestId })
      .sort({ timestamp: 1 })
      .toArray();
  }
  
  /**
   * Find a message by its requestId
   * @param requestId The requestId to search for
   * @returns The message or null if not found
   */
  async findMessageByRequestId(requestId: string): Promise<MessageModel | null> {
    const { db } = await connectToDatabase();
    const collection = db.collection<MessageModel>(this.collectionName);
    
    // Execute the query
    const message = await collection.findOne({ requestId });
    
    // If not found with exact match, try a different approach with case-insensitive regex
    if (!message) {
      const messageCI = await collection.findOne({
        requestId: { $regex: new RegExp(`^${requestId}$`, 'i') }
      });
      
      return messageCI;
    }
    
    return message;
  }
  
  /**
   * Clear all messages for a channel
   * @param channelId The channel ID
   * @returns Number of messages deleted
   */
  async clearChannel(channelId: string): Promise<number> {
    const { db } = await connectToDatabase();
    const collection = db.collection<MessageModel>(this.collectionName);
    
    const result = await collection.deleteMany({ channelId });
    return result.deletedCount;
  }
} 