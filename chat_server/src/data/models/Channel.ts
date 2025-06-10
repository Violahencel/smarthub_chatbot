import { ObjectId } from 'mongodb';
import { connectToDatabase } from '../db';

export interface ParticipantModel {
  id: string;
  name: string;
  type: string;
  isActive?: boolean;
  isBot?: boolean;
  joinedAt: number;
  lastActiveAt: number;
}

export interface ChannelModel {
  _id?: ObjectId;
  channelId: string;
  name?: string;
  description?: string;
  active: boolean;
  participants: ParticipantModel[];
  createdAt: number;
  updatedAt: number;
}

export class ChannelRepository {
  private collectionName = 'channels';
  
  /**
   * Save or update a channel
   * @param channel The channel to save
   * @returns The saved channel
   */
  async saveChannel(channel: ChannelModel): Promise<ChannelModel> {
    const { db } = await connectToDatabase();
    const collection = db.collection<ChannelModel>(this.collectionName);
    
    // Update the updatedAt timestamp
    channel.updatedAt = Date.now();
    
    const existing = await collection.findOne({ channelId: channel.channelId });
    
    if (existing) {
      // Update existing channel
      await collection.updateOne(
        { channelId: channel.channelId },
        { $set: channel }
      );
      return channel;
    } else {
      // Insert new channel
      channel.createdAt = Date.now();
      await collection.insertOne(channel);
      return channel;
    }
  }
  
  /**
   * Get a channel by its ID
   * @param channelId The channel ID
   * @returns The channel or null if not found
   */
  async getChannelById(channelId: string): Promise<ChannelModel | null> {
    const { db } = await connectToDatabase();
    const collection = db.collection<ChannelModel>(this.collectionName);
    
    return collection.findOne({ channelId });
  }
  
  /**
   * Get all channels
   * @returns Array of all channels
   */
  async getAllChannels(): Promise<ChannelModel[]> {
    const { db } = await connectToDatabase();
    const collection = db.collection<ChannelModel>(this.collectionName);
    
    return collection.find().toArray();
  }
  
  /**
   * Add a participant to a channel
   * @param channelId The channel ID
   * @param participant The participant to add
   * @returns The updated channel
   */
  async addParticipant(channelId: string, participant: ParticipantModel): Promise<ChannelModel | null> {
    const { db } = await connectToDatabase();
    const collection = db.collection<ChannelModel>(this.collectionName);
    
    // First, check if the channel exists
    const channel = await this.getChannelById(channelId);
    if (!channel) {
      // Create the channel if it doesn't exist
      return this.saveChannel({
        channelId,
        active: true,
        participants: [participant],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // Check if participant already exists
    const existingParticipantIndex = channel.participants.findIndex(p => p.id === participant.id);
    
    if (existingParticipantIndex >= 0) {
      // Update the existing participant
      channel.participants[existingParticipantIndex] = {
        ...channel.participants[existingParticipantIndex],
        ...participant,
        lastActiveAt: Date.now(),
      };
    } else {
      // Add the new participant
      channel.participants.push({
        ...participant,
        joinedAt: Date.now(),
        lastActiveAt: Date.now(),
      });
    }
    
    return this.saveChannel(channel);
  }
  
  /**
   * Remove a participant from a channel
   * @param channelId The channel ID
   * @param participantId The participant ID to remove
   * @returns The updated channel
   */
  async removeParticipant(channelId: string, participantId: string): Promise<ChannelModel | null> {
    const { db } = await connectToDatabase();
    const collection = db.collection<ChannelModel>(this.collectionName);
    
    const channel = await this.getChannelById(channelId);
    if (!channel) return null;
    
    // Filter out the participant
    channel.participants = channel.participants.filter(p => p.id !== participantId);
    
    return this.saveChannel(channel);
  }
  
  /**
   * Set the active state of a channel
   * @param channelId The channel ID
   * @param active Whether the channel is active
   * @returns The updated channel
   */
  async setChannelActive(channelId: string, active: boolean): Promise<ChannelModel | null> {
    const channel = await this.getChannelById(channelId);
    if (!channel) return null;
    
    channel.active = active;
    return this.saveChannel(channel);
  }
} 