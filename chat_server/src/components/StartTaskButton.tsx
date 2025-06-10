import React, { useState } from 'react';
import { Button } from './UI/button';
import { FileUploadModal } from './FileUploadModal';

interface StartTaskButtonProps {
  className?: string;
  buttonText?: string;
  isChannelActive?: boolean;
}

export function StartTaskButton({ 
  className = '', 
  buttonText = 'Start New Task',
  isChannelActive = false
}: StartTaskButtonProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUploadComplete = async (records: any[]) => {
    setIsProcessing(true);
    try {
      // Send message to chat after successful upload
      const messageContent = {
        channelId: "general",
        content: `@fileprep Start Tasks: [json]{
            "action": "start_task",
            "data": ${JSON.stringify(records)}
        }[/json]`
      };

      const messageResponse = await fetch('/api/channels/general/sendMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageContent),
      });

      if (!messageResponse.ok) {
        throw new Error('Failed to send message to chat');
      }

      // Close the modal after successful message send
      setIsUploadModalOpen(false);
    } catch (error) {
      console.error('Error in task workflow:', error);
      // You might want to show an error notification here
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setIsUploadModalOpen(true)}
        className={className}
        disabled={isProcessing || !isChannelActive}
      >
        {isProcessing ? 'Processing...' : !isChannelActive ? 'Channel Inactive' : buttonText}
      </Button>

      <FileUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
        title="Upload Order Files"
        folderPath="aido_order_files"
        maxFileSize={process.env.NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE_MB ? parseInt(process.env.NEXT_PUBLIC_FILE_UPLOAD_MAX_SIZE_MB) * 1024 * 1024 : 5 * 1024 * 1024} // 3MB
        allowedTypes={['application/pdf']}
        multiple={true}
      />
    </>
  );
} 