import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Server as NetServer } from 'http';
import { processMessage } from '../../../../utils/messageProcessor';
// The MessageRepository is now imported and used within messageProcessor.ts
// import { MessageRepository } from '../../../../data/models/Message';

// Define the extended response type to access the Socket.IO server
type ExtendedNextApiResponse = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

// The message repository instance is now created and managed within messageProcessor.ts
// const messageRepository = new MessageRepository();

export default async function handler(
  req: NextApiRequest,
  res: ExtendedNextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { channelId } = req.query;
  
  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).json({ error: 'Channel ID is required' });
  }
  
  const io = res.socket?.server?.io;
  
  if (!io) {
    return res.status(400).json({ 
      error: 'Socket.IO server not initialized',
      message: 'Please initialize the server from the admin page first' 
    });
  }
  
  try {
    // Access the channel data from the Socket.IO server
    const channelsMap = (global as any).channels;
    
    if (!channelsMap || !channelsMap.has(channelId)) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const channel = channelsMap.get(channelId);
    
    // Clear the messages array
    channel.messages = [];
    
    // Create and process the system message using the unified function
    const systemMessage = await processMessage(
      channelId,
      'Chat history has been cleared by the administrator.',
      'system',
      'System',
      'system',
      channel,
      'rest-api-clear'
    );
    
    // Notify all clients in the channel about the clear
    io.to(`channel:${channelId}`).emit('chat_cleared');
    
    // Also send the system message
    io.to(`channel:${channelId}`).emit('new_message', systemMessage);
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error clearing chat:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 