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
  const { channelId, operation } = req.query;
  
  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).json({ error: 'Channel ID is required' });
  }
  
  if (!operation || (operation !== 'start' && operation !== 'stop')) {
    return res.status(400).json({ error: 'Valid operation (start/stop) is required' });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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
    
    if (!channelsMap && operation === 'start') {
      // Create channels map if it doesn't exist
      (global as any).channels = new Map();
    }
    
    if (operation === 'start') {
      if (!(global as any).channels.has(channelId)) {
        (global as any).channels.set(channelId, { 
          participants: new Set(),
          active: true,
          messages: []
        });
      } else {
        const channel = (global as any).channels.get(channelId);
        channel.active = true;
      }
      
      // Notify clients
      io.to(`channel:${channelId}`).emit('channel_started', {
        channelId,
        timestamp: Date.now()
      });
      
      return res.status(200).json({ 
        channelId,
        operation: 'start',
        success: true 
      });
    } else if (operation === 'stop') {
      if ((global as any).channels && (global as any).channels.has(channelId)) {
        const channel = (global as any).channels.get(channelId);
        channel.active = false;
        
        // Notify clients
        io.to(`channel:${channelId}`).emit('channel_stopped', {
          channelId,
          timestamp: Date.now()
        });
      }
      
      return res.status(200).json({ 
        channelId,
        operation: 'stop',
        success: true 
      });
    }
    
    return res.status(400).json({ error: 'Invalid operation' });
  } catch (error: any) {
    console.error(`Error performing ${operation} operation on channel:`, error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 