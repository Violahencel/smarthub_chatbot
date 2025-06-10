/**
 * Message Processor Utility
 * 
 * Shared utilities for processing chat messages across the application.
 * Used by both WebSocket handlers and REST API endpoints.
 */

import { MessageRepository } from '../data/models/Message';

// Create a singleton message repository instance
const messageRepository = new MessageRepository();

/**
 * Extract tags from message content
 * @param content Message content
 * @returns Array of tags
 */
export function extractTags(content: string): string[] {
  const tags: string[] = [];
  const tagMatches = content.match(/@(\w+)/g);
  
  if (tagMatches) {
    tagMatches.forEach((tag: string) => {
      tags.push(tag.substring(1)); // Remove the @ symbol
    });
  }
  
  return tags;
}

/**
 * Extract dataId from message content
 * @param content Message content
 * @returns Extracted dataId or null
 */
export function extractDataId(content: string): string | null {
  const dataIdMatch = content.match(/\[data_id:\s*(\w+)\]/);
  return dataIdMatch ? dataIdMatch[1] : null;
}

/**
 * Extract requestId from message content
 * @param content Message content
 * @returns Extracted requestId or null
 */
export function extractRequestId(content: string): string | null {
  const requestIdMatch = content.match(/\[requestId:\s*(\w+)\]/);
  return requestIdMatch ? requestIdMatch[1] : null;
}

/**
 * Extract parentRequestId from message content
 * @param content Message content
 * @returns Extracted parentRequestId or null
 */
export function extractParentRequestId(content: string): string | null {
  const parentRequestIdMatch = content.match(/\[parentRequestId:\s*(\w+)\]/);
  return parentRequestIdMatch ? parentRequestIdMatch[1] : null;
}

/**
 * Extract status from message content
 * @param content Message content
 * @returns Extracted status or null
 */
export function extractStatus(content: string): string | null {
  // Generic regex to match any status value:
  // [status: any_value] or [status:"any value"] or [status:'any value']
  const statusMatch = content.match(/\[status:?\s*['"]?([^'"\[\]]+)['"]?\]/i);
  const status = statusMatch ? statusMatch[1].trim().toLowerCase() : null;
  return status;
}

/**
 * Extract JSON content from message wrapped in [json] and [/json] tags
 * @param content Message content
 * @returns Object with JSON data, preprocessed content, and success status
 */
export function extractJsonContent(content: string): { 
  hasJson: boolean; 
  jsonData: Record<string, any> | null; 
  displayContent: string;
  error?: string;
} {
  const result = {
    hasJson: false,
    jsonData: null as Record<string, any> | null,
    displayContent: content,
    error: undefined as string | undefined
  };
  
  // Check if content has [json] tags
  const jsonRegex = /\[json\]([\s\S]*?)\[\/json\]/g;
  let match: RegExpExecArray | null;
  const matches: RegExpExecArray[] = [];
  
  // Collect all matches manually instead of using matchAll
  while ((match = jsonRegex.exec(content)) !== null) {
    matches.push(match);
  }
  
  if (matches.length === 0) {
    return result;
  }
  
  result.hasJson = true;
  let processedContent = content;
  
  // Process all JSON blocks
  for (const match of matches) {
    const fullMatch = match[0]; // The entire match including tags
    const jsonString = match[1]; // Just the content between tags
    
    try {
      // Try to parse the JSON
      const jsonData = JSON.parse(jsonString);
      
      // Replace each JSON block with a placeholder
      const jsonId = generateMessageId(); // Generate a unique ID for this JSON block
      processedContent = processedContent.replace(
        fullMatch, 
        `[json-view id="${jsonId}"]`
      );
      
      // Store the JSON data
      if (result.jsonData === null) {
        result.jsonData = {};
      }
      result.jsonData[jsonId] = jsonData;
    } catch (err) {
      // If JSON is invalid, replace with an error message
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      processedContent = processedContent.replace(
        fullMatch, 
        `[Invalid JSON: ${errorMessage}]`
      );
      result.error = `Invalid JSON: ${errorMessage}`;
    }
  }
  
  result.displayContent = processedContent;
  return result;
}

/**
 * Extract id from message content
 * @param content Message content
 * @returns Extracted id or null
 */
export function extractId(content: string): string | null {
  const idMatch = content.match(/\[id:\s*(\w+)\]/);
  return idMatch ? idMatch[1] : null;
}

/**
 * Process message content to extract tags, dataId, requestId, parentRequestId, and status
 * @param content Message content
 * @returns Object containing extracted tags, dataId, requestId, parentRequestId, and status
 */
export function processMessageContent(content: string): {
  tags: string[];
  dataId: string | null;
  requestId: string | null;
  parentRequestId: string | null;
  status: string | null;
  jsonData: any | null;
  displayContent: string;
} {
  // Extract JSON content first, as it might modify the content
  const jsonResult = extractJsonContent(content);
  
  return {
    tags: extractTags(jsonResult.displayContent),
    dataId: extractId(jsonResult.displayContent),
    requestId: extractRequestId(jsonResult.displayContent),
    parentRequestId: extractParentRequestId(jsonResult.displayContent),
    status: extractStatus(jsonResult.displayContent),
    jsonData: jsonResult.jsonData,
    displayContent: jsonResult.displayContent
  };
}

/**
 * Generate a unique message ID
 * @returns Unique message ID
 */
export function generateMessageId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Create a chat message object
 * @param channelId Channel ID
 * @param content Message content
 * @param senderId Sender ID
 * @param senderName Sender name
 * @param senderType Sender type
 * @returns Complete chat message object
 */
export function createChatMessage(
  channelId: string,
  content: string,
  senderId: string,
  senderName: string,
  senderType: string
): any {
  // Process the content
  const { 
    tags, 
    dataId, 
    requestId, 
    parentRequestId, 
    status, 
    jsonData, 
    displayContent 
  } = processMessageContent(content);
  
  // Create and return the message object
  return {
    id: generateMessageId(),
    channelId,
    senderId,
    senderName,
    senderType,
    content,            // Original content with JSON tags
    displayContent,     // Content with JSON tags replaced with placeholders
    jsonData,           // Extracted JSON data
    tags,              // Extracted tags
    dataId,            // Extracted data ID
    requestId,         // Extracted requestId
    parentRequestId,   // Extracted parentRequestId
    status,            // Extracted status
    timestamp: Date.now()
  };
}

/**
 * Process a message: create it, store it in the channel, log to database if needed, and return it
 * This unified function should be used by all message-processing entry points (WebSocket, REST API)
 * 
 * @param channelId Channel ID
 * @param content Message content
 * @param senderId Sender ID
 * @param senderName Sender name
 * @param senderType Sender type
 * @param channel Channel object to store the message in
 * @param source Optional source identifier for logging (e.g. 'websocket', 'rest-api')
 * @returns The created message object
 */
export async function processMessage(
  channelId: string,
  content: string,
  senderId: string,
  senderName: string,
  senderType: string,
  channel: any,
  source: string = 'unknown'
): Promise<any> {
  // Create the message
  const message = createChatMessage(
    channelId,
    content,
    senderId,
    senderName,
    senderType
  );
  
  // Save message to channel history
  if (channel && channel.messages) {
    channel.messages.push(message);
  }
  
  // Log messages with requestId or parentRequestId to the database
  try {
    if (message.requestId) {
      await messageRepository.saveMessage(message);
    } else if (message.parentRequestId) {
      await messageRepository.saveMessage(message);
      
      // If message has a status, update the parent request's status as well
      if (message.status) {
        try {
          // Find the parent request
          const parentRequest = await messageRepository.findMessageByRequestId(message.parentRequestId);
          
          if (parentRequest) {
            // Update the status
            parentRequest.status = message.status;
            await messageRepository.saveMessage(parentRequest);
          }
        } catch (error) {
          console.error(`Error updating parent request status:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error logging message to database:`, error);
    // Don't fail the process if database logging fails
  }
  
  return message;
} 