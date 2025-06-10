/**
 * Example usage of the MongoDB data layer
 * This file provides examples of how to use the repositories
 */

import { 
  SharedDataRepository,
  MessageRepository,
  ChannelRepository
} from './index';

// Initialize repositories
const sharedDataRepo = new SharedDataRepository();
const messageRepo = new MessageRepository();
const channelRepo = new ChannelRepository();

// Example: Save a new channel
async function createChannel() {
  try {
    const channel = await channelRepo.saveChannel({
      channelId: 'general',
      name: 'General Chat',
      description: 'Main discussion channel',
      active: true,
      participants: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    console.log('Channel created:', channel);
    return channel;
  } catch (error) {
    console.error('Error creating channel:', error);
    throw error;
  }
}

// Example: Add a participant to a channel
async function addParticipant() {
  try {
    const participant = {
      id: 'bot-123',
      name: 'Assistant Bot',
      type: 'bot',
      isBot: true,
      isActive: true,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
    };
    
    const channel = await channelRepo.addParticipant('general', participant);
    console.log('Participant added:', channel);
    return channel;
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
}

// Example: Save a message
async function saveMessage() {
  try {
    const message = {
      id: `msg-${Date.now()}`,
      channelId: 'general',
      senderId: 'bot-123',
      senderName: 'Assistant Bot',
      senderType: 'bot',
      content: 'Hello, this is a test message!',
      tags: ['test'],
      timestamp: Date.now(),
    };
    
    const savedMessage = await messageRepo.saveMessage(message);
    console.log('Message saved:', savedMessage);
    return savedMessage;
  } catch (error) {
    console.error('Error saving message:', error);
    throw error;
  }
}

// Example: Save shared data
async function saveSharedData() {
  try {
    const sharedData = {
      dataId: `data-${Date.now()}`,
      type: 'json',
      filePath: `/path/to/data-${Date.now()}.json`,
      senderId: 'bot-123',
      timestamp: Date.now(),
      originalSize: 1024,
      metadata: {
        filename: 'test-data.json',
        contentType: 'application/json',
        size: 1024,
      },
      createdAt: Date.now(),
    };
    
    const savedData = await sharedDataRepo.saveData(sharedData);
    console.log('Shared data saved:', savedData);
    return savedData;
  } catch (error) {
    console.error('Error saving shared data:', error);
    throw error;
  }
}

// Example: Fetch messages for a channel
async function getChannelMessages() {
  try {
    const messages = await messageRepo.getByChannel('general');
    console.log(`Found ${messages.length} messages in channel`);
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    throw error;
  }
}

// Function to run all examples
async function runExamples() {
  try {
    await createChannel();
    await addParticipant();
    await saveMessage();
    await saveSharedData();
    const messages = await getChannelMessages();
    console.log('Examples completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Example execution failed:', error);
    process.exit(1);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
} 