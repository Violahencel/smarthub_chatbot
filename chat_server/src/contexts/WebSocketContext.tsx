import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Basic types
interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderType: string;
  content: string;
  timestamp: number;
  tags?: string[];
}

interface ChannelStatus {
  active: boolean;
  participants: Array<{
    id: string;
    name: string;
    type: string;
    window_hwnd?: number;
  }>;
}

interface WebSocketContextType {
  // Connection state
  isConnected: boolean;
  error: Error | null;
  
  // Chat state
  messages: Message[];
  channelStatus: ChannelStatus;
  
  // UI state
  activeChannel: string;
  
  // Actions
  sendMessage: (content: string) => void;
  switchChannel: (channelId: string) => void;
  startChannel: () => void;
  stopChannel: () => void;
  clearMessages: () => void;
}

// Create context
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// Provider component
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>({ active: false, participants: [] });
  const [activeChannel, setActiveChannel] = useState('general');

  // Initialize socket connection
  useEffect(() => {
    // Use window.location.origin as fallback to support any hostname
    const socketUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || window.location.origin;
    console.log('Connecting to socket server at:', socketUrl);
    
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      path: '/api/socket',
      query: {
        botId: "system",
        botName: "System"
      }
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setIsConnected(true);
      setError(null);
      
      // Register the service
      newSocket.emit('register', {
        botId: "system",
        name: "System",
        type: "system"
      });
      
      // Join default channel
      newSocket.emit('join_channel', activeChannel);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError(err);
    });

    // Handle incoming messages
    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    // Handle channel status updates
    newSocket.on('channel_status', (status: ChannelStatus) => {
      setChannelStatus(status);
    });

    // Handle participant events
    newSocket.on('participant_joined', (data) => {
      console.log(`Participant joined: ${data.name} (${data.participantId})`);
      setChannelStatus(prev => ({
        ...prev,
        participants: prev.participants.some(p => p.id === data.participantId) 
          ? prev.participants 
          : [...prev.participants, {
              id: data.participantId,
              name: data.name,
              type: data.type || 'user'
            }]
      }));
    });

    newSocket.on('participant_left', (data) => {
      console.log(`Participant left: ${data.name || data.participantId}`);
      setChannelStatus(prev => ({
        ...prev,
        participants: prev.participants.filter(p => p.id !== data.participantId)
      }));
    });

    // Handle channel events
    newSocket.on('channel_started', (data) => {
      console.log(`Channel started: ${data.channelId}`);
      setChannelStatus(prev => ({ 
        ...prev, 
        active: true,
        participants: [] // Reset participants when channel starts
      }));
    });

    newSocket.on('channel_stopped', (data) => {
      console.log(`Channel stopped: ${data.channelId}`);
      setChannelStatus(prev => ({ ...prev, active: false }));
    });

    setSocket(newSocket);

    return () => {
      if (newSocket.connected) {
        newSocket.emit('leave_channel', activeChannel);
      }
      newSocket.close();
    };
  }, []);

  // Send message
  const sendMessage = useCallback((content: string) => {
    if (socket && isConnected) {
      socket.emit('message', {
        channelId: activeChannel,
        content
      });
    }
  }, [socket, isConnected, activeChannel]);

  // Switch channel
  const switchChannel = useCallback((channelId: string) => {
    if (socket && isConnected) {
      socket.emit('leave_channel', activeChannel);
      socket.emit('join_channel', channelId);
      setActiveChannel(channelId);
      setMessages([]); // Clear messages when switching channels
    }
  }, [socket, isConnected, activeChannel]);

  // Start channel
  const startChannel = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('start_channel', activeChannel);
      setChannelStatus(prev => ({ ...prev, active: true }));
    }
  }, [socket, isConnected, activeChannel]);

  // Stop channel
  const stopChannel = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('stop_channel', activeChannel);
      setChannelStatus(prev => ({ ...prev, active: false }));
    }
  }, [socket, isConnected, activeChannel]);

  // Clear messages
  const clearMessages = useCallback(() => {
    if (socket && isConnected) {
      socket.emit('clearChat', { channelId: activeChannel });
      setMessages([]);
    }
  }, [socket, isConnected, activeChannel]);

  const value = {
    isConnected,
    error,
    messages,
    channelStatus,
    activeChannel,
    sendMessage,
    switchChannel,
    startChannel,
    stopChannel,
    clearMessages
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
} 