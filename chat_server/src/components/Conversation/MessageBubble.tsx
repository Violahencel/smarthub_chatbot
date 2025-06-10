import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import JsonViewButton from '../JsonViewButton';

interface MessageBubbleProps {
  content: string;
  displayContent?: string; // Optional displayContent for processed messages
  jsonData?: Record<string, any> | null; // JSON data extracted from the message
  sender: string;
  timestamp: number;
  isServerMessage: boolean;
}

// Helper to format Math Calcy Bot responses as bullets
function formatMathBotResponse(content: string) {
  // Try to split by numbered steps or dashes, fallback to splitting by newlines
  const lines = content.split(/\n|\d+\. |\- /).map(s => s.trim()).filter(Boolean);
  return lines;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  displayContent,
  jsonData,
  sender,
  timestamp,
  isServerMessage,
}) => {
  const formattedTime = formatDistanceToNow(new Date(timestamp * 1000), {
    addSuffix: true,
  });

  // Process content to render JSON view buttons
  const renderContent = () => {
    // If we have jsonData and displayContent, we need to render special buttons
    if (jsonData && displayContent) {
      // Split by the JSON view placeholders
      const parts = displayContent.split(/(\[json-view id="[^"]+"\])/);
      
      return parts.map((part, index) => {
        // Check if this part is a JSON placeholder
        const match = part.match(/\[json-view id="([^"]+)"\]/);
        if (match && match[1] && jsonData[match[1]]) {
          // Render a button for this JSON block
          return <JsonViewButton key={index} id={match[1]} jsonData={jsonData[match[1]]} />;
        }
        // Otherwise just render the text
        return part ? <span key={index}>{part}</span> : null;
      });
    }
    
    // Fallback to regular content if no JSON data
    return content;
  };

  // Manual JSON detection for backward compatibility
  const detectJsonInMessage = (messageContent: string) => {
    if (!messageContent) return messageContent;
    
    // Check if the message contains [json]...[/json] tags
    const jsonRegex = /\[json\]([\s\S]*?)\[\/json\]/g;
    
    // If there are no JSON tags, return the original content
    if (!messageContent.match(jsonRegex)) {
      return messageContent;
    }
    
    // Replace JSON blocks with View JSON buttons
    let processedContent = messageContent;
    let match;
    let index = 0;
    const jsonSegments: Record<string, any> = {};
    
    // Reset regex state
    jsonRegex.lastIndex = 0;
    
    while ((match = jsonRegex.exec(messageContent)) !== null) {
      try {
        const fullMatch = match[0];
        const jsonContent = match[1];
        const jsonData = JSON.parse(jsonContent);
        const jsonId = `inline-json-${index++}`;
        
        // Store the parsed JSON
        jsonSegments[jsonId] = jsonData;
        
        // Replace the JSON block with a placeholder
        processedContent = processedContent.replace(
          fullMatch,
          `[json-view id="${jsonId}"]`
        );
      } catch (err) {
        // If JSON parsing fails, leave it as is
        console.error('Error parsing inline JSON:', err);
      }
    }
    
    // If we processed any JSON, render with the JsonViewButton components
    if (Object.keys(jsonSegments).length > 0) {
      const parts = processedContent.split(/(\[json-view id="[^"]+"\])/);
      
      return parts.map((part, idx) => {
        // Check if this part is a JSON placeholder
        const placeholderMatch = part.match(/\[json-view id="([^"]+)"\]/);
        if (placeholderMatch && placeholderMatch[1] && jsonSegments[placeholderMatch[1]]) {
          // Render a button for this JSON block
          return (
            <JsonViewButton 
              key={idx} 
              id={placeholderMatch[1]} 
              jsonData={jsonSegments[placeholderMatch[1]]} 
            />
          );
        }
        // Otherwise just render the text
        return part ? <span key={idx}>{part}</span> : null;
      });
    }
    
    // If no JSON was processed successfully, return the original content
    return messageContent;
  };
  
  // First try using the processed content from the message processor
  // If that doesn't work, try to detect JSON in the raw content as a fallback
  const messageContent = jsonData && displayContent 
    ? renderContent() 
    : detectJsonInMessage(content);

  // Math Calcy Bot special rendering
  const isMathBot = sender === 'Math Calcy Bot' || sender === 'math_calcy';

  if (isMathBot) {
    return (
      <div className="flex justify-start mb-4">
        <div className="flex flex-col">
          <div className="math-bot-bubble">
            <div className="font-bold mb-2">Math Calcy Bot Answer:</div>
            <ul className="list-disc pl-5">
              {formatMathBotResponse(content).map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
          </div>
          <div className="text-xs mt-1 text-left text-gray-500">
            {sender} • {formattedTime}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isServerMessage ? 'justify-start' : 'justify-end'} mb-4`}>
      <div className="flex flex-col">
        <div className={`message-bubble ${isServerMessage ? 'server-message' : 'user-message'}`}>
          <div>{messageContent}</div>
        </div>
        <div className={`text-xs mt-1 ${isServerMessage ? 'text-left' : 'text-right'} text-gray-500`}>
          {sender} • {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble; 