import axios from 'axios';

/**
 * Sends keyboard input to a specific window using its window handle
 * @param windowHandle The window handle (HWND) to send keys to
 * @param text The text or keyboard combination to send
 * @returns Promise resolving to success status and message
 */
export async function sendKeysToWindow(windowHandle: number, text: string): Promise<{ success: boolean; message?: string }> {
  try {
    if (!windowHandle) {
      return { success: false, message: 'Invalid window handle' };
    }

    const response = await axios.post('http://localhost:8000/api/send_keys', {
      hwnd: windowHandle, 
      text
    });

    if (response.status === 200) {
      return { success: true };
    } else {
      return { 
        success: false, 
        message: response.data?.message || 'Failed to send keys to window'
      };
    }
  } catch (error: any) {
    console.error('Error sending keys to window:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || error.message || 'Error sending keys to window'
    };
  }
}

/**
 * Sends Ctrl+C to a specific window using its window handle
 * @param windowHandle The window handle (HWND) to send Ctrl+C to
 * @returns Promise resolving to success status and message
 */
export async function sendCtrlCToWindow(windowHandle: number): Promise<{ success: boolean; message?: string }> {
  return sendKeysToWindow(windowHandle, '^c');  // ^ represents Ctrl in SendKeys format
}