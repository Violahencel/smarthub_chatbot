import { Server as SocketIOServer } from 'socket.io';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { Server as NetServer } from 'http';
import type { Socket } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { createChatMessage, processMessage } from '../../utils/messageProcessor';
import { SharedDataRepository } from '../../data/models/SharedData';
import { SharedData, SharedDataMetadata } from '../../types/shared-data';
// The MessageRepository is now imported and used within messageProcessor.ts
// import { MessageRepository } from '../../data/models/Message';

// Augment the response type to include custom socket properties
type SocketIONextApiResponse = NextApiResponse & {
  socket: any & {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

// Define participant type
interface Participant {
  id: string;
  name: string;
  type: string;
  window_hwnd?: number;  // Add window handle
  commands?: {
    restart?: string;
    remove?: string;
    [x:string]: string | undefined;
  }
}

// Define message type
interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  content: string;
  tags: string[];
  dataId: string | null;
  requestId: string | null;
  timestamp: number;
}

// Define channel type
interface Channel {
  participants: Set<Participant>;
  active: boolean;
  messages: ChatMessage[];
}

interface BotTasks {
  id: string;
  name: string;
  status: string;
  startTime: string;
  endTime?: string;
  result?: any
}

interface BotState {
  tasks: BotTasks[];
  [x:string]: any;
}

// Global variable to store Socket.IO server instance
let io: SocketIOServer;

// Global channels map
const channels = new Map<string, Channel>();
// Make channels available globally
(global as any).channels = channels;

// Global clients map to track all connected clients
const clients = new Map<string, {
  id: string;
  botId?: string;
  name?: string;
  type?: string;
  botState?: BotState;
  window_hwnd?: number;
  commands?: any;
}>();
// Make clients available globally
(global as any).clients = clients;

// Create a global map to store shared data (for backward compatibility)
const sharedDataStore = new Map<string, SharedData>();
// Make data store available globally
(global as any).sharedDataStore = sharedDataStore;

// The message repository instance is now created and managed within messageProcessor.ts
// const messageRepository = new MessageRepository();

// Initialize shared data repository
const sharedDataRepository = new SharedDataRepository();

// Ensure data directory exists
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'shared_data');

// Function to ensure the data directory exists
async function ensureDataDirExists() {
  try {
    await fsPromises.mkdir(DATA_DIR, { recursive: true });
    console.log(`Data directory created/ensured at: ${DATA_DIR}`);
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Function to save metadata to file
async function saveMetadata(metadata: SharedDataMetadata[]) {
  try {
    await fsPromises.writeFile(path.join(DATA_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));
  } catch (err) {
    console.error('Error saving metadata:', err);
  }
}

// Function to load metadata from file
async function loadMetadata(): Promise<SharedDataMetadata[]> {
  try {
    const data = await fsPromises.readFile(path.join(DATA_DIR, 'metadata.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading metadata:', err);
    return [];
  }
}

// Initialize the data directory at startup
(async () => {
  await ensureDataDirExists();
  
  // Load existing data from MongoDB into memory store for backward compatibility
  try {
    const allData = await sharedDataRepository.getAllData();
    
    for (const item of allData) {
      let content = '';
      
      // For small text files, load the content into memory if needed
      if ((item.type === 'string' || item.type === 'json') && item.filePath) {
        try {
          // Extract filename from the URL
          const fileName = path.basename(new URL(item.filePath).pathname);
          const localFilePath = path.join(DATA_DIR, fileName);
          
          if (fs.existsSync(localFilePath)) {
            content = await fsPromises.readFile(localFilePath, 'utf8');
          }
        } catch (err) {
          console.error(`Error loading file for ${item.dataId}:`, err);
        }
      }
      
      sharedDataStore.set(item.dataId, {
        id: item.dataId,
        type: item.type as any,
        content: content,
        filePath: item.filePath,
        timestamp: item.timestamp,
        senderId: item.senderId
      });
    }
    
    console.log(`Loaded ${allData.length} shared data items from MongoDB`);
  } catch (err) {
    console.error('Error loading data from MongoDB:', err);
  }
})();

export default function handler(req: NextApiRequest, res: SocketIONextApiResponse) {
  if (res.socket.server.io) {
    // If the Socket.IO server is already running, just return success
    console.log('Socket server already running');
    res.status(200).json({ message: 'Socket.IO server already running' });
    return;
  }

  try {
    console.log('Setting up Socket.IO server...');
    
    // Configure Socket.IO with generous CORS settings
    io = new SocketIOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        allowedHeaders: ['*'],
        credentials: true
      },
      transports: ['websocket', 'polling'],
    });
    
    // Store the io instance on the server object
    res.socket.server.io = io;

    io.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);
      
      // Bot registration
      socket.on('register', (data: { botId: string; name: string; type?: string; commands?: any; window_hwnd?: number; bot_state?: any }) => {
        console.log('Bot registered:', data);
        socket.data.botId = data.botId;
        socket.data.name = data.name;
        socket.data.type = data.type || 'bot';
        socket.data.commands = data.commands || {};
        socket.data.window_hwnd = data.window_hwnd || 0;
        socket.data.bot_state = data.bot_state || {};
        
        // Add client to global clients map
        clients.set(socket.id, {
          id: socket.id,
          botId: data.botId,
          name: data.name,
          type: data.type || 'bot',
          commands: data.commands || {},
          window_hwnd: data.window_hwnd || 0,
          botState: data.bot_state || {}
        });
        
        // Broadcast to all clients that a new bot is available
        io.emit('bot_registered', {
          botId: data.botId,
          name: data.name,
          type: data.type || 'bot',
          window_hwnd: data.window_hwnd || 0,
          commands: data.commands || {},
          botState: data.bot_state || {}
        });
      });

      // Join channel
      socket.on('join_channel', (channelId: string) => {
        console.log(`${socket.data.name || socket.id} joining channel: ${channelId}`);
        socket.join(`channel:${channelId}`);
        
        // Get channel or create if doesn't exist
        if (!channels.has(channelId)) {
          console.log(`Creating new channel: ${channelId}`);
          channels.set(channelId, { 
            participants: new Set<Participant>(),
            active: true,
            messages: []
          });
        }
        
        const channel = channels.get(channelId);
        if (channel) {
          const participantId = socket.data.botId || socket.id;
          
          // Remove any existing participant with the same ID
          channel.participants.forEach((p: Participant) => {
            if (p.id === participantId) {
              channel.participants.delete(p);
            }
          });
          
          // Add the new participant
          const participant: Participant = {
            id: participantId,
            name: socket.data.name || 'Anonymous',
            type: socket.data.type || 'user',
            commands: socket.data.commands || {},
            window_hwnd: socket.data.window_hwnd || 0  // Include window handle
          };
          
          channel.participants.add(participant);
          
          // Notify all participants in the channel
          io.to(`channel:${channelId}`).emit('participant_joined', {
            participantId: participantId,
            name: socket.data.name || 'Anonymous',
            type: socket.data.type || 'user',
            window_hwnd: socket.data.window_hwnd || 0,  // Include window handle
            commands: socket.data.commands || {},
            timestamp: Date.now()
          });
          
          // Notify the client about the channel status
          socket.emit('channel_status', {
            channelId,
            active: channel.active,
            participants: Array.from(channel.participants),
            timestamp: Date.now()
          });
        }
      });

      // Leave channel
      socket.on('leave_channel', (channelId: string) => {
        console.log(`${socket.data.name || socket.id} leaving channel: ${channelId}`);
        socket.leave(`channel:${channelId}`);
        
        const channel = channels.get(channelId);
        if (channel) {
          // Remove participant from the channel
          channel.participants.forEach((participant: Participant) => {
            if (participant.id === (socket.data.botId || socket.id)) {
              channel.participants.delete(participant);
            }
          });
          
          // Notify all participants in the channel
          io.to(`channel:${channelId}`).emit('participant_left', {
            participantId: socket.data.botId || socket.id,
            name: socket.data.name || 'Anonymous',
            timestamp: Date.now()
          });
        }
      });

      socket.on('bot_state_updated', (data: { botId: string, botState: BotState }) => {
        // console.log(`State update for bot: ${data.botId}, state: ${JSON.stringify(data.botState)}`);
        
        // Update the client's state in the global clients map
        let updated = false;
        clients.forEach((client) => {
          if (client.botId === data.botId) {
            client.botState = data.botState;
            updated = true;
          }
        });

        // console.log('Clients:', clients);
        // clients.forEach((client) => {
        //   console.log('Client:', client.botState);
        // });

        // If no client found with this botId, log a warning
        if (!updated) {
          console.warn(`No client found with botId: ${data.botId}`);
          return;
        }
        
        // Broadcast the state update to all connected clients
        io.emit('bot_state_updated', {
          botId: data.botId,
          botState: data.botState,
          timestamp: Date.now()
        });
      });

      // Chat message
      socket.on('message', async (message: { channelId: string; content: string, senderName: string, senderId: string }) => {
        console.log(`Message from ${socket.data.name || socket.id}:`, message.content);
        
        const channelId = message.channelId;
        let channel = channels.get(channelId);
        
        // Automatically create and activate the channel if it doesn't exist
        if (!channel) {
          console.log(`Auto-creating channel for message: ${channelId}`);
          channel = { 
            participants: new Set<Participant>(),
            active: true,
            messages: []
          };
          channels.set(channelId, channel);
          
          // Make sure the sender is in the channel
          const participant: Participant = {
            id: message.senderId || socket.data.botId || socket.id,
            name: message.senderName || socket.data.name || 'Anonymous',
            type: socket.data.type || 'user',
            window_hwnd: socket.data.window_hwnd || 0,
            commands: socket.data.commands || {}
          };
          channel.participants.add(participant);
        }
        
        // Auto-activate the channel if inactive but has a message
        if (!channel.active) {
          console.log(`Auto-activating inactive channel: ${channelId}`);
          channel.active = true;
          
          // Notify participants that the channel is now active
          io.to(`channel:${channelId}`).emit('channel_started', {
            channelId,
            timestamp: Date.now()
          });
        }
        
        // Use the unified message processing function
        const enrichedMessage = await processMessage(
          channelId,
          message.content,
          socket.data.botId || socket.id,
          socket.data.name || 'Anonymous',
          socket.data.type || 'user',
          channel,
          'websocket'
        );
        
        // Broadcast to all in the channel
        io.to(`channel:${channelId}`).emit('new_message', enrichedMessage);
      });

      // Data sharing event
      socket.on('share_data', async (data: { 
        channelId: string; 
        content: string; 
        type?: 'string' | 'image' | 'document' | 'json' 
      }, callback: (response: { dataId: string, error?: string }) => void) => {
        try {
          console.log(`Data share request from ${socket.data.name || socket.id} in channel ${data.channelId}`);
          
          // Validate input
          if (!data.content) {
            return callback({ dataId: '', error: 'Content is required' });
          }
          
          // Generate a unique ID for the data
          const dataId = `data_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
          const type = data.type || 'string'; // Default to string if not specified
          
          // Ensure data directory exists
          await ensureDataDirExists();
          
          // Determine file extension based on type
          let fileExt = '.txt';
          if (type === 'json') fileExt = '.json';
          else if (type === 'image') fileExt = '.png'; // Default, might be overridden for base64 images
          else if (type === 'document') fileExt = '.txt';
          
          // Determine the file path
          const fileName = `${dataId}${fileExt}`;
          let filePath = path.join(DATA_DIR, fileName);
          let content = data.content;
          let originalSize = Buffer.byteLength(content, 'utf8');
          
          // Special handling for image data URLs
          if (type === 'image' && content.startsWith('data:image/')) {
            const matches = content.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const imageType = matches[1];
              const base64Data = matches[2];
              
              // Update file extension based on actual image type
              fileExt = `.${imageType}`;
              const updatedFileName = `${dataId}${fileExt}`;
              filePath = path.join(DATA_DIR, updatedFileName);
              
              // Convert base64 to binary for file storage
              const buffer = Buffer.from(base64Data, 'base64');
              originalSize = buffer.length;
              
              // Write the binary data to file
              await fsPromises.writeFile(filePath, buffer);
              console.log(`Image saved to ${filePath}`);
            } else {
              // If not a valid data URL, save as text
              await fsPromises.writeFile(filePath, content);
              console.log(`Image data saved as text to ${filePath}`);
            }
          } else {
            // For other types, save as text
            await fsPromises.writeFile(filePath, content);
            console.log(`Data saved to ${filePath}`);
          }
          
          // Create the full URL for storage (will be used for future cloud storage)
          const serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
          const fileUrl = `${serverUrl}/api/data/files/${path.basename(filePath)}`;
          
          // Save metadata to MongoDB
          await sharedDataRepository.saveData({
            dataId,
            type,
            filePath: fileUrl, // Store the URL instead of local path
            timestamp: Date.now(),
            senderId: socket.data.botId || socket.id,
            originalSize,
            metadata: {},
            createdAt: Date.now()
          });
          
          // Add to in-memory store as well for backward compatibility
          const sharedData: SharedData = {
            id: dataId,
            type,
            content: type === 'string' || type === 'json' ? content : '', // Only keep text content in memory
            filePath: fileUrl,
            timestamp: Date.now(),
            senderId: socket.data.botId || socket.id
          };
          
          sharedDataStore.set(dataId, sharedData);
          console.log(`Data stored with ID: ${dataId}, file: ${filePath}`);
          
          // Return the data ID to the client
          callback({ dataId });
        } catch (error: any) {
          console.error('Error processing shared data:', error);
          callback({ dataId: '', error: error.message || 'Unknown error processing data' });
        }
      });
      
      // Data retrieval event
      socket.on('get_data', async (dataId: string, callback: (data: { 
        id: string;
        type: string;
        content: string;
        timestamp: number;
        error?: string
      }) => void) => {
        try {
          console.log(`Data retrieval request for ID: ${dataId}`);
          
          // Try to get from MongoDB first
          const dataMetadata = await sharedDataRepository.getDataById(dataId);
          
          if (!dataMetadata) {
            // Fallback to in-memory store for backward compatibility
            if (!sharedDataStore.has(dataId)) {
              return callback({
                id: '',
                type: '',
                content: '',
                timestamp: 0,
                error: 'Data not found'
              });
            }
            
            const data = sharedDataStore.get(dataId)!;
            return callback({
              id: data.id,
              type: data.type,
              content: data.content,
              timestamp: data.timestamp
            });
          }
          
          // Data found in MongoDB, handle accordingly
          // Extract filename from the URL
          let content = '';
          const parsedUrl = new URL(dataMetadata.filePath);
          const fileName = path.basename(parsedUrl.pathname);
          const localFilePath = path.join(DATA_DIR, fileName);
          
          // For text-based content, read the file
          if ((dataMetadata.type === 'string' || dataMetadata.type === 'json') && 
              fs.existsSync(localFilePath)) {
            try {
              content = await fsPromises.readFile(localFilePath, 'utf8');
            } catch (err: any) {
              console.error(`Error reading file ${localFilePath}:`, err);
              return callback({
                id: dataMetadata.dataId,
                type: dataMetadata.type,
                content: '',
                timestamp: dataMetadata.timestamp,
                error: `Error reading file: ${err.message}`
              });
            }
          }
          
          callback({
            id: dataMetadata.dataId,
            type: dataMetadata.type,
            content: content,
            timestamp: dataMetadata.timestamp
          });
        } catch (error: any) {
          console.error('Error retrieving shared data:', error);
          callback({
            id: '',
            type: '',
            content: '',
            timestamp: 0,
            error: error.message || 'Unknown error retrieving data'
          });
        }
      });

      // Channel operations
      socket.on('start_channel', (channelId: string) => {
        console.log(`Starting channel: ${channelId}`);
        
        if (!channels.has(channelId)) {
          channels.set(channelId, { 
            participants: new Set<Participant>(),
            active: true,
            messages: []
          });
        } else {
          const channel = channels.get(channelId);
          if (channel) {
            channel.active = true;
            // Clear messages when restarting
            channel.messages = [];
          }
        }
        
        io.to(`channel:${channelId}`).emit('channel_started', {
          channelId,
          timestamp: Date.now()
        });
      });

      socket.on('stop_channel', (channelId: string) => {
        console.log(`Stopping channel: ${channelId}`);
        
        if (channels.has(channelId)) {
          const channel = channels.get(channelId);
          if (channel) {
            channel.active = false;
            
            io.to(`channel:${channelId}`).emit('channel_stopped', {
              channelId,
              timestamp: Date.now()
            });
          }
        }
      });

      // Get channel details
      socket.on('get_channel_details', (channelId: string, callback: (data: any) => void) => {
        const channel = channels.get(channelId);
        
        if (channel) {
          callback({
            channelId,
            active: channel.active,
            participants: Array.from(channel.participants),
            messageCount: channel.messages.length
          });
        } else {
          callback({
            channelId,
            active: false,
            participants: [],
            messageCount: 0,
            error: 'Channel not found'
          });
        }
      });

      // Get channel messages
      socket.on('get_channel_messages', (channelId: string, callback: (data: any) => void) => {
        const channel = channels.get(channelId);
        
        if (channel) {
          callback({
            channelId,
            messages: channel.messages
          });
        } else {
          callback({
            channelId,
            messages: [],
            error: 'Channel not found'
          });
        }
      });

      // Disconnect handling
      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        // Remove client from global clients map
        clients.delete(socket.id);
        
        // Handle any cleanup needed
        channels.forEach((channel, channelId) => {
          const participantId = socket.data.botId || socket.id;
          
          // Remove this participant from the channel
          channel.participants.forEach((participant: Participant) => {
            if (participant.id === participantId) {
              channel.participants.delete(participant);
              
              // Notify others that this participant left
              io.to(`channel:${channelId}`).emit('participant_left', {
                participantId: participantId,
                name: socket.data.name || 'Anonymous',
                timestamp: Date.now()
              });
            }
          });
        });
      });

      // Error handling
      socket.on('error', (error: any) => {
        console.error('Socket error:', error);
      });
    });
    
    console.log('Socket.IO server started');
    res.status(200).json({ message: 'Socket.IO server initialized' });
  } catch (error: any) {
    console.error('Failed to start Socket.IO server:', error);
    res.status(500).json({ error: `Failed to start Socket.IO server: ${error.message || 'Unknown error'}` });
  }
} 