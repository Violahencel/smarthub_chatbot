import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import type { Socket } from 'socket.io';
import type { Server as NetServer } from 'http';

// Define the extended response type
type ExtendedNextApiResponse = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

export default function handler(
  req: NextApiRequest,
  res: ExtendedNextApiResponse
) {
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
    
    if (!channelsMap) {
      return res.status(200).json({ 
        channelId,
        messages: []
      });
    }
    
    const channel = channelsMap.get(channelId);
    
    if (!channel) {
      return res.status(200).json({ 
        channelId,
        messages: []
      });
    }
    
    return res.status(200).json({
      channelId,
      messages: channel.messages || []
    });
  } catch (error: any) {
    console.error('Error fetching channel messages:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 