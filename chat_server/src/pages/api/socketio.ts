import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';

// Define a type for the response with socket that has the server property
type ExtendedNextApiResponse = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: any;
    };
  };
};

export default async function handler(
  req: NextApiRequest,
  res: ExtendedNextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the origin for server-side requests
    const origin = process.env.NEXT_PUBLIC_BASE_URL || 
      (req.headers.host ? `http://${req.headers.host}` : 'http://localhost:3000');
    
    // Access socket server directly through internal API route 
    // (without using fetch to avoid transport issues)
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
    
    // Check if Socket.IO server was initialized
    if (res.socket?.server?.io) {
      return res.status(200).json({ message: 'Socket.IO server initialized successfully' });
    } else {
      console.error('Failed to initialize Socket.IO server: Server not attached to socket');
      return res.status(500).json({ message: 'Failed to initialize Socket.IO server' });
    }
  } catch (error: any) {
    console.error('Error initializing Socket.IO server:', error);
    return res.status(500).json({ message: `Internal server error: ${error.message || 'Unknown error'}` });
  }
} 