import type { NextApiRequest, NextApiResponse } from 'next';
import { Server } from 'socket.io';
import type { Server as NetServer } from 'http';

type SocketIONextApiResponse = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io?: Server;
    };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: SocketIONextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { channelId } = req.query;
  const { targetId, command } = req.body;

  if (!targetId || !command) {
    return res.status(400).json({ success: false, message: 'Missing required parameters' });
  }

  if (!channelId || typeof channelId !== 'string') {
    return res.status(400).json({ success: false, message: 'Invalid channel ID' });
  }

  try {
    const io = res.socket.server.io;
    
    if (!io) {
      console.error('Socket.IO instance not found');
      return res.status(500).json({ success: false, message: 'WebSocket server not available' });
    }

    // Emit the control_command event to all clients in the channel
    io.to(`channel:${channelId}`).emit('control_command', {
      targetId,
      command,
      timestamp: Date.now(),
      sender: 'admin'
    });

    // Log the action
    console.log(`Control command "${command}" sent to ${targetId} in channel ${channelId}`);

    // Add a system message to the channel
    io.to(`channel:${channelId}`).emit('control_command', {
      id: `msg_${Date.now()}`,
      channelId,
      senderId: 'system',
      senderName: 'System',
      senderType: 'system',
      command: 'restart',
      content: `Admin sent a "${command}" command to ${targetId}`,
      tags: [],
      timestamp: Date.now()
    });

    return res.status(200).json({ 
      success: true, 
      message: `Control command sent to ${targetId}` 
    });
  } catch (error) {
    console.error('Error sending control command:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error'
    });
  }
} 