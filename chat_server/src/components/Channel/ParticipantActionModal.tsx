import React, { useEffect } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';

interface ParticipantActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: {
    id: string;
    name: string;
    type: string;
    window_hwnd?: number;
    commands?: Record<string, string | undefined>;
  } | null;
}

const ParticipantActionModal: React.FC<ParticipantActionModalProps> = ({
  isOpen,
  onClose,
  participant,
}) => {
  const { activeChannel, isConnected } = useWebSocket();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !participant) return null;

  const notifyInChannel = async (message: string) => {
    if (!participant) return;

    try {
      const messageContent = {
        channelId: activeChannel,
        content: message,
        senderId: 'system',
        senderName: 'System',
      };

      await fetch(`/api/channels/${activeChannel}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messageContent),
      });
    } catch {}
  }

  const handleCancel = async () => {
    if (!participant) return;

    try {
      // Use fetch to send the control command through the API
      const response = await fetch(`/api/channels/${activeChannel}/controlCommand`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetId: participant.id,
          command: 'cancel'
        }),
      });

      if (response.ok) {
        console.log(`Cancel command sent to ${participant.name}`);
        await notifyInChannel(`${participant.name} task has been cancelled`);
        onClose();
      } else {
        console.error('Failed to send cancel command');
      }
    } catch (error) {
      console.error('Error sending cancel command:', error);
    }
  };

  const isBot = participant.type === 'task_bot';
  const hasWindowHandle = !!participant.window_hwnd;

  return (
    <div className="fixed inset-0 bg-gray-600/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-xs w-full p-4 transform transition-all duration-200">
        {/* Header - Name and Type in single row */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">{participant.name}</h3>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 px-2 py-1 rounded-full text-indigo-800 dark:text-indigo-300">
              {participant.type}
            </span>
          </div>
          <button
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors duration-200"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Window Handle */}
        {hasWindowHandle && (
          <div className="mb-4">
            <span className="inline-flex items-center bg-gray-100 dark:bg-gray-700/50 px-3 py-1.5 rounded-lg text-sm">
              <span className="font-medium text-gray-600 dark:text-gray-300 mr-2">HWND:</span>
              <span className="text-gray-900 dark:text-gray-100">{participant.window_hwnd}</span>
            </span>
          </div>
        )}

        {/* Actions Section */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Actions</h4>
          {isBot ? (
            <button
              onClick={handleCancel}
              className="w-full px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40 text-sm rounded-lg transition-colors duration-200 font-medium"
            >
              Cancel Task
            </button>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">No actions available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantActionModal; 