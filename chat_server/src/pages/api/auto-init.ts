import type { NextApiRequest, NextApiResponse } from 'next';
import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

// Define the extended response type
type ExtendedNextApiResponse = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

// Export a config to tell Next.js to treat this as an Edge API Route
export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: ExtendedNextApiResponse
) {
  // If Socket.IO is already initialized, just return
  if (res.socket.server.io) {
    return res.status(200).json({ message: 'Socket.IO server already running' });
  }

  try {
    // Import and initialize the Socket.IO server
    const socketModule = await import('./socket');
    const socketHandler = socketModule.default;

    // Execute the socket handler directly
    await new Promise<void>((resolve) => {
      // Create a simple mock response object to capture the result
      const mockRes = {
        socket: res.socket,
        status: () => mockRes,
        json: () => mockRes,
        end: () => {
          resolve();
          return mockRes;
        }
      } as any;
      
      socketHandler(req, mockRes);
    });

    // Check if initialization was successful
    if (res.socket.server.io) {
      console.log('Socket.IO auto-initialized on server start');
      return res.status(200).json({ message: 'Socket.IO server auto-initialized' });
    } else {
      console.error('Failed to auto-initialize Socket.IO server');
      return res.status(500).json({ error: 'Failed to auto-initialize Socket.IO server' });
    }
  } catch (error: any) {
    console.error('Error auto-initializing Socket.IO server:', error);
    return res.status(500).json({ error: error.message || 'Unknown error' });
  }
} 